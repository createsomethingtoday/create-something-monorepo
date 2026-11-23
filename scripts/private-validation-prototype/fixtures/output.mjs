// Owned adversarial fixture: the host must bound combined stdout/stderr.
while (true) process.stdout.write('x'.repeat(4096));
