-- Add vid_lmc_continental so /watch/vid_lmc_continental is playable
INSERT INTO videos (id, title, category, episode_number, tier, duration, asset_path, thumbnail_path, description, created_at, updated_at) VALUES
  ('vid_lmc_continental', 'LMC Continental', 'lmc', NULL, 'free', 600, '/videos/lmc/continental.mp4', '/thumbnails/lmc/continental.jpg', 'LMC Continental', strftime('%s', 'now'), strftime('%s', 'now'));
