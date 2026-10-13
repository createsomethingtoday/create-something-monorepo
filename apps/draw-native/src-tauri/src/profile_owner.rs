//! One cooperating native writer per canonical profile. Never unlink the lock inode.
use super::*;
use std::fs::File;
#[cfg(unix)] use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

pub(super) struct Owner(File);
impl Drop for Owner { fn drop(&mut self) { let _=self.0.unlock(); } }

pub(super) fn claim(home: &Path) -> Result<Owner,String> {
    fs::create_dir_all(home).map_err(|e|e.to_string())?;
    if fs::canonicalize(home).map_err(|e|e.to_string())? != home { return Err("Draw profile must have a canonical path without symlinks".into()); }
    #[cfg(unix)] fs::set_permissions(home,fs::Permissions::from_mode(0o700)).map_err(|e|e.to_string())?;
    let path=home.join("native-writer.lock");
    if let Ok(metadata)=fs::symlink_metadata(&path) {
        if !metadata.is_file() || metadata.file_type().is_symlink() { return Err("Unsafe Draw ownership file".into()); }
    }
    let mut options=OpenOptions::new(); options.create(true).read(true).write(true);
    #[cfg(unix)] options.mode(0o600);
    let file=options.open(&path).map_err(|e|e.to_string())?;
    #[cfg(unix)] {
        use std::os::unix::fs::MetadataExt;
        let opened=file.metadata().map_err(|e|e.to_string())?;
        let named=fs::symlink_metadata(&path).map_err(|e|e.to_string())?;
        if opened.ino()!=named.ino() || opened.dev()!=named.dev() || named.file_type().is_symlink() || opened.nlink()!=1 {
            return Err("Draw ownership file changed".into());
        }
        file.set_permissions(fs::Permissions::from_mode(0o600)).map_err(|e|e.to_string())?;
    }
    file.try_lock().map_err(|_|"This Draw profile is already open in another native process".to_string())?;
    Ok(Owner(file))
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn ownership_is_exclusive_and_released_without_deleting_inode() {
        let home=fs::canonicalize(std::env::temp_dir()).unwrap().join(format!("draw-owner-{}",Uuid::new_v4()));
        let first=claim(&home).unwrap();
        assert!(claim(&home).is_err());
        drop(first); assert!(home.join("native-writer.lock").exists());
        let second=claim(&home).unwrap();drop(second);
        fs::remove_dir_all(home).unwrap();
    }
    #[cfg(unix)] #[test] fn symbolic_lock_is_rejected() {
        let home=fs::canonicalize(std::env::temp_dir()).unwrap().join(format!("draw-owner-{}",Uuid::new_v4()));
        fs::create_dir(&home).unwrap();fs::write(home.join("target"),b"keep").unwrap();
        std::os::unix::fs::symlink(home.join("target"),home.join("native-writer.lock")).unwrap();
        assert!(claim(&home).is_err());assert_eq!(fs::read(home.join("target")).unwrap(),b"keep");fs::remove_dir_all(home).unwrap();
    }
}
