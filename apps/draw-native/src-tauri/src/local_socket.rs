//! Shared local-agent framing and a credential-free, isolated binary diagnostic.
use std::{fs, io::{BufRead, BufReader, Read, Write}, os::unix::{fs::{DirBuilderExt, PermissionsExt}, net::{UnixListener, UnixStream}}, sync::mpsc, thread, time::{Duration, Instant}};

pub(super) fn configure(stream: &UnixStream) -> Result<(), String> {
    // Darwin inherits O_NONBLOCK from the listener; timeouts do not clear it.
    stream.set_nonblocking(false).map_err(|_| "Local stream mode unavailable")?;
    stream.set_read_timeout(Some(Duration::from_secs(2))).map_err(|_| "Local read timeout unavailable")?;
    stream.set_write_timeout(Some(Duration::from_secs(2))).map_err(|_| "Local write timeout unavailable")?;
    Ok(())
}

pub(super) fn read_frame(stream: &mut UnixStream) -> Result<Vec<u8>, String> {
    let mut line = Vec::new();
    BufReader::new(stream.take(2 * 1024 * 1024 + 1)).read_until(b'\n', &mut line)
        .map_err(|_| "Incomplete local request")?;
    if line.len() > 2 * 1024 * 1024 || line.last() != Some(&b'\n') {
        return Err("Invalid local request size or framing".into());
    }
    Ok(line)
}

/// Exercises this binary's production stream setup/framing, without starting
/// Draw, loading a profile, issuing a grant or accepting any external path/token.
pub fn verify_transport() -> Result<(), String> {
    let directory = std::path::PathBuf::from("/tmp").join(format!("draw-transport-check-{}", uuid::Uuid::new_v4()));
    fs::DirBuilder::new().mode(0o700).create(&directory).map_err(|_| "Probe directory unavailable")?;
    struct Cleanup(std::path::PathBuf);
    impl Drop for Cleanup {
        fn drop(&mut self) { let _=fs::remove_file(self.0.join("probe.sock")); let _=fs::remove_dir(&self.0); }
    }
    let _cleanup = Cleanup(directory.clone());
    let path = directory.join("probe.sock");
    let listener = UnixListener::bind(&path).map_err(|_| "Probe listener unavailable")?;
    fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).map_err(|_| "Probe permissions unavailable")?;
    listener.set_nonblocking(true).map_err(|_| "Probe listener mode unavailable")?;
    let (accepted, ready) = mpsc::channel();
    let server = thread::spawn(move || -> Result<(), String> {
        for _ in 0..2 {
            let deadline = Instant::now() + Duration::from_secs(3);
            let mut stream = loop {
                match listener.accept() {
                    Ok((stream, _)) => break stream,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock && Instant::now() < deadline => thread::sleep(Duration::from_millis(1)),
                    Err(_) => return Err("Probe accept failed or timed out".into()),
                }
            };
            configure(&stream)?;
            accepted.send(()).map_err(|_| "Probe client unavailable")?;
            if read_frame(&mut stream)? != b"synthetic-transport-check\n" { return Err("Probe frame mismatch".into()); }
            stream.write_all(b"ok\n").map_err(|_| "Probe response failed")?;
        }
        Ok(())
    });
    let client_result = (|| -> Result<(), String> {
        for fragmented in [false, true] {
            let mut client = UnixStream::connect(&path).map_err(|_| "Probe connection failed")?;
            client.set_read_timeout(Some(Duration::from_secs(3))).map_err(|_| "Probe client timeout unavailable")?;
            client.set_write_timeout(Some(Duration::from_secs(3))).map_err(|_| "Probe client timeout unavailable")?;
            ready.recv_timeout(Duration::from_secs(3)).map_err(|_| "Probe accept confirmation missing")?;
            let payload = b"synthetic-transport-check\n";
            let split = if fragmented { 10 } else { 0 };
            if split > 0 { client.write_all(&payload[..split]).map_err(|_| "Probe fragment failed")?; }
            thread::sleep(Duration::from_millis(50));
            client.write_all(&payload[split..]).map_err(|_| "Probe delayed send failed")?;
            let mut response = String::new();
            BufReader::new(client).read_line(&mut response).map_err(|_| "Probe response unavailable")?;
            if response != "ok\n" { return Err("Probe response mismatch".into()); }
        }
        Ok(())
    })();
    let server_result = server.join().map_err(|_| "Probe server stopped unexpectedly")?;
    client_result?;
    server_result
}

#[cfg(test)] mod tests {
    #[test] fn binary_transport_probe_needs_no_profile_or_grant() { super::verify_transport().unwrap(); }
}
