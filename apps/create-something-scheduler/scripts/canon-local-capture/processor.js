class CanonPCM extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4096);
    this.offset = 0;
    this.pending = 0;
    this.failed = false;
    this.port.onmessage = ({ data }) => {
      if (data === 'flush') {
        this.failed = true; // Freeze capture before acknowledging its final partial block.
        const samples = this.buffer.slice(0, this.offset);
        this.offset = 0;
        this.port.postMessage({ type: 'flushed', samples }, [samples.buffer]);
      } else if (data === 'ack') this.pending = Math.max(0, this.pending - 1);
    };
  }
  process(inputs) {
    if (this.failed) return true;
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (const sample of channel) {
      this.buffer[this.offset++] = sample;
      if (this.offset === this.buffer.length) {
        if (this.pending >= 8) {
          this.failed = true;
          this.port.postMessage({ error: 'Capture controller cannot keep up.' });
          return true;
        }
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.pending++;
        this.buffer = new Float32Array(4096);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('canon-pcm', CanonPCM);
