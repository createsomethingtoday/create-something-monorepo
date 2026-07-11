export function reviewerCaseCap(sampleSize: number, maximumShare: number): number {
  return Math.max(1, Math.floor(sampleSize * maximumShare));
}
