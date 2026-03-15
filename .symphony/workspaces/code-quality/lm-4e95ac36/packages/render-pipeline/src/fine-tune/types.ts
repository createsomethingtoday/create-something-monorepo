/**
 * Fine-Tuning Types
 * Types for Flux LoRA training and inference
 */

/**
 * Type of LoRA training
 */
export type LoraType = 'style' | 'subject';

/**
 * Training configuration
 */
export interface TrainingConfig {
  /** Path to zip file containing training images */
  inputImages: string | Buffer;
  /** Unique trigger word for the style (e.g., "CSMTH") */
  triggerWord: string;
  /** Type of LoRA: 'style' for aesthetic, 'subject' for objects/people */
  loraType: LoraType;
  /** Number of training steps (default: 1000) */
  steps?: number;
  /** Optional caption for all images (if not using per-image captions) */
  caption?: string;
}

/**
 * Training result
 */
export interface TrainingResult {
  /** Prediction ID from Replicate */
  predictionId: string;
  /** Status of training */
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  /** URL to trained model weights (when succeeded) */
  modelUrl?: string;
  /** Version identifier for the trained model */
  versionId?: string;
  /** Error message if failed */
  error?: string;
  /** Training duration in seconds */
  durationSeconds?: number;
  /** Cost estimate in USD */
  costEstimate?: number;
}

/**
 * Fine-tuned model reference
 */
export interface FineTunedModel {
  /** Model identifier (e.g., "username/model-name:version") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Trigger word for this model */
  triggerWord: string;
  /** LoRA scale for inference (0-1, default: 0.8) */
  loraScale?: number;
}

/**
 * Generation options for fine-tuned model
 */
export interface FineTuneGenerateOptions {
  /** Text prompt (must include trigger word) */
  prompt: string;
  /** Number of inference steps (default: 28) */
  steps?: number;
  /** Guidance scale (default: 3.5) */
  guidance?: number;
  /** LoRA strength (default: 0.8) */
  loraScale?: number;
  /** Output width (default: 1024) */
  width?: number;
  /** Output height (default: 1024) */
  height?: number;
  /** Output file path */
  outputPath?: string;
  /** Seed for reproducibility */
  seed?: number;
}

/**
 * Generation result
 */
export interface FineTuneGenerateResult {
  /** Generated image buffer */
  image: Buffer;
  /** Output path if saved */
  outputPath?: string;
  /** Prediction ID */
  predictionId: string;
  /** Generation duration in ms */
  duration: number;
  /** Seed used */
  seed?: number;
}

/**
 * Training image metadata for curation
 */
export interface TrainingImage {
  /** Unique identifier */
  id: string;
  /** Source URL (e.g., Are.na CDN) */
  sourceUrl: string;
  /** Local path after download */
  localPath?: string;
  /** R2 object key */
  r2Key?: string;
  /** Image dimensions */
  width?: number;
  height?: number;
  /** Source channel/collection */
  source: string;
  /** Whether this image is selected for training */
  selected: boolean;
  /** Optional caption override */
  caption?: string;
}

/**
 * Training dataset manifest
 */
export interface TrainingManifest {
  /** Unique identifier for this training set */
  id: string;
  /** Creation timestamp */
  createdAt: string;
  /** Trigger word for this training */
  triggerWord: string;
  /** Images in the training set */
  images: TrainingImage[];
  /** Total image count */
  totalImages: number;
  /** Selected image count */
  selectedImages: number;
  /** R2 bucket for cached images */
  r2Bucket: string;
  /** Zip file path/key when packaged */
  zipPath?: string;
}
