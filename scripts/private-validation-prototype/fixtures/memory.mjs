// Owned adversarial fixture: touched allocations exceed the cgroup memory cap.
const buffers = [];
while (true) buffers.push(Buffer.alloc(8 * 1048576, 1));
