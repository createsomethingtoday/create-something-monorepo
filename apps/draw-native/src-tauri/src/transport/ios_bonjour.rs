use std::{
    cell::UnsafeCell,
    collections::HashMap,
    ffi::{CStr, CString},
    os::raw::{c_char, c_int, c_void},
    ptr,
    time::{Duration, Instant},
};

use super::DiscoveredHost;
use create_something_draw_pairing_protocol::PROTOCOL_VERSION;

type DnsServiceRef = *mut c_void;
type DnsServiceFlags = u32;
type DnsServiceError = i32;
const NO_ERROR: DnsServiceError = 0;
const MAX_CERTIFICATE_CHUNKS: usize = 32;
const MAX_VALIDATED_HOSTS: usize = 16;
const DISCOVERY_RESOLUTION_TIMEOUT: Duration = Duration::from_secs(5);

#[link(name = "dns_sd")]
unsafe extern "C" {
    fn DNSServiceBrowse(
        sd_ref: *mut DnsServiceRef,
        flags: DnsServiceFlags,
        interface_index: u32,
        regtype: *const c_char,
        domain: *const c_char,
        callback: extern "C" fn(
            DnsServiceRef,
            DnsServiceFlags,
            u32,
            DnsServiceError,
            *const c_char,
            *const c_char,
            *const c_char,
            *mut c_void,
        ),
        context: *mut c_void,
    ) -> DnsServiceError;
    fn DNSServiceResolve(
        sd_ref: *mut DnsServiceRef,
        flags: DnsServiceFlags,
        interface_index: u32,
        name: *const c_char,
        regtype: *const c_char,
        domain: *const c_char,
        callback: extern "C" fn(
            DnsServiceRef,
            DnsServiceFlags,
            u32,
            DnsServiceError,
            *const c_char,
            *const c_char,
            u16,
            u16,
            *const u8,
            *mut c_void,
        ),
        context: *mut c_void,
    ) -> DnsServiceError;
    fn DNSServiceRefSockFD(sd_ref: DnsServiceRef) -> c_int;
    fn DNSServiceProcessResult(sd_ref: DnsServiceRef) -> DnsServiceError;
    fn DNSServiceRefDeallocate(sd_ref: DnsServiceRef);
}

#[derive(Clone)]
struct ServiceName {
    interface_index: u32,
    name: String,
    regtype: String,
    domain: String,
}

extern "C" fn browse_callback(
    _service: DnsServiceRef,
    _flags: DnsServiceFlags,
    interface_index: u32,
    error: DnsServiceError,
    name: *const c_char,
    regtype: *const c_char,
    domain: *const c_char,
    context: *mut c_void,
) {
    if error != NO_ERROR || name.is_null() || regtype.is_null() || domain.is_null() {
        return;
    }
    // SAFETY: DNS-SD owns these strings for the callback duration and context
    // points to the live vector supplied by `browse_services`.
    unsafe {
        let services = &mut *(context as *mut Vec<ServiceName>);
        let value = ServiceName {
            interface_index,
            name: CStr::from_ptr(name).to_string_lossy().into_owned(),
            regtype: CStr::from_ptr(regtype).to_string_lossy().into_owned(),
            domain: CStr::from_ptr(domain).to_string_lossy().into_owned(),
        };
        if !services.iter().any(|entry| entry.name == value.name) {
            services.push(value);
        }
    }
}

extern "C" fn resolve_callback(
    _service: DnsServiceRef,
    _flags: DnsServiceFlags,
    _interface_index: u32,
    error: DnsServiceError,
    _fullname: *const c_char,
    hostname: *const c_char,
    port: u16,
    txt_len: u16,
    txt_record: *const u8,
    context: *mut c_void,
) {
    if error != NO_ERROR || hostname.is_null() || txt_record.is_null() {
        return;
    }
    // SAFETY: callback buffers are valid for this invocation and context points
    // to the live `UnsafeCell` supplied by `resolve_service`. DNS-SD invokes the
    // callback synchronously from `DNSServiceProcessResult`, so no other access
    // to the slot occurs until this write completes.
    unsafe {
        let result = &*(context as *const UnsafeCell<Option<(String, u16, Vec<u8>)>>);
        *result.get() = Some((
            CStr::from_ptr(hostname).to_string_lossy().into_owned(),
            u16::from_be(port),
            std::slice::from_raw_parts(txt_record, txt_len as usize).to_vec(),
        ));
    }
}

fn process_until(
    service: DnsServiceRef,
    deadline: Instant,
    complete: impl Fn() -> bool,
) -> Result<(), String> {
    while !complete() {
        let Some(remaining) = deadline.checked_duration_since(Instant::now()) else {
            break;
        };
        // SAFETY: `service` remains live until this function returns.
        let mut descriptor = libc::pollfd {
            fd: unsafe { DNSServiceRefSockFD(service) },
            events: libc::POLLIN,
            revents: 0,
        };
        let timeout = remaining.as_millis().min(c_int::MAX as u128) as c_int;
        // SAFETY: `descriptor` is valid for one poll entry.
        let ready = unsafe { libc::poll(&mut descriptor, 1, timeout) };
        if ready < 0 {
            return Err(std::io::Error::last_os_error().to_string());
        }
        if ready == 0 {
            break;
        }
        // SAFETY: the DNS-SD reference is live and its socket reported readable.
        let error = unsafe { DNSServiceProcessResult(service) };
        if error != NO_ERROR {
            return Err(format!("Bonjour processing failed ({error})"));
        }
    }
    Ok(())
}

fn browse_services(service_type: &str) -> Result<Vec<ServiceName>, String> {
    let registration_type = service_type.strip_suffix(".local.").unwrap_or(service_type);
    let service_type = CString::new(registration_type).map_err(|error| error.to_string())?;
    let mut service = ptr::null_mut();
    let mut found = Vec::<ServiceName>::new();
    // SAFETY: all pointers remain valid until the synchronous browse loop ends.
    let error = unsafe {
        DNSServiceBrowse(
            &mut service,
            0,
            0,
            service_type.as_ptr(),
            ptr::null(),
            browse_callback,
            (&mut found as *mut Vec<ServiceName>).cast(),
        )
    };
    if error != NO_ERROR {
        return Err(format!("Bonjour browse failed ({error})"));
    }
    let processed = process_until(service, Instant::now() + Duration::from_secs(3), || false);
    // SAFETY: DNS-SD returned this reference and it has not been deallocated.
    unsafe { DNSServiceRefDeallocate(service) };
    processed.map(|_| found)
}

fn resolve_service(
    name: &ServiceName,
    discovery_deadline: Instant,
) -> Result<(String, u16, Vec<u8>), String> {
    let instance = CString::new(name.name.as_str()).map_err(|error| error.to_string())?;
    let regtype = CString::new(name.regtype.as_str()).map_err(|error| error.to_string())?;
    let domain = CString::new(name.domain.as_str()).map_err(|error| error.to_string())?;
    let mut service = ptr::null_mut();
    let result = UnsafeCell::new(None::<(String, u16, Vec<u8>)>);
    // SAFETY: all pointers remain valid until the synchronous resolve loop ends.
    let error = unsafe {
        DNSServiceResolve(
            &mut service,
            0,
            name.interface_index,
            instance.as_ptr(),
            regtype.as_ptr(),
            domain.as_ptr(),
            resolve_callback,
            (&result as *const UnsafeCell<Option<(String, u16, Vec<u8>)>>)
                .cast_mut()
                .cast(),
        )
    };
    if error != NO_ERROR {
        return Err(format!("Bonjour resolve failed ({error})"));
    }
    let service_deadline = (Instant::now() + Duration::from_secs(2)).min(discovery_deadline);
    let processed = process_until(service, service_deadline, || {
        // SAFETY: DNS-SD callbacks and this completion check execute
        // sequentially on this thread inside `DNSServiceProcessResult`.
        unsafe { (*result.get()).is_some() }
    });
    // SAFETY: DNS-SD returned this reference and it has not been deallocated.
    unsafe { DNSServiceRefDeallocate(service) };
    processed?;
    result
        .into_inner()
        .ok_or_else(|| "Bonjour resolve timed out".into())
}

fn txt_properties(record: &[u8]) -> HashMap<String, String> {
    let mut properties = HashMap::new();
    let mut offset = 0;
    while offset < record.len() {
        let length = record[offset] as usize;
        offset += 1;
        if length == 0 || offset + length > record.len() {
            break;
        }
        if let Ok(entry) = std::str::from_utf8(&record[offset..offset + length]) {
            if let Some((key, value)) = entry.split_once('=') {
                properties.insert(key.to_ascii_lowercase(), value.to_string());
            }
        }
        offset += length;
    }
    properties
}

pub(super) fn discover(service_type: &str) -> Result<Vec<DiscoveredHost>, String> {
    let mut hosts = Vec::new();
    let discovery_deadline = Instant::now() + DISCOVERY_RESOLUTION_TIMEOUT;
    for service in browse_services(service_type)? {
        if hosts.len() >= MAX_VALIDATED_HOSTS || Instant::now() >= discovery_deadline {
            break;
        }
        let Ok((hostname, port, txt)) = resolve_service(&service, discovery_deadline) else {
            continue;
        };
        let properties = txt_properties(&txt);
        let (Some(protocol_version), Some(session_id), Some(fingerprint)) = (
            properties.get("protocol"),
            properties.get("session"),
            properties.get("fingerprint"),
        ) else {
            continue;
        };
        if protocol_version != PROTOCOL_VERSION {
            continue;
        }
        let part_count = properties
            .get("certparts")
            .and_then(|value| value.parse::<usize>().ok())
            .filter(|count| (1..=MAX_CERTIFICATE_CHUNKS).contains(count))
            .unwrap_or_default();
        let certificate_der = (0..part_count)
            .filter_map(|index| properties.get(&format!("cert{index}")))
            .cloned()
            .collect::<String>();
        if part_count == 0 || certificate_der.is_empty() {
            continue;
        }
        let host = DiscoveredHost {
            endpoint: format!("https://{}:{}", hostname.trim_end_matches('.'), port),
            session_id: session_id.clone(),
            protocol_version: protocol_version.clone(),
            certificate_fingerprint: fingerprint.clone(),
            certificate_der,
        };
        if !hosts
            .iter()
            .any(|entry: &DiscoveredHost| entry.session_id == host.session_id)
        {
            hosts.push(host);
        }
    }
    Ok(hosts)
}
