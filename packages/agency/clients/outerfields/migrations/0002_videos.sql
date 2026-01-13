-- Videos table for content catalog with tiering metadata
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  episode_number INTEGER,
  tier TEXT NOT NULL CHECK(tier IN ('free', 'preview', 'gated')),
  duration INTEGER NOT NULL,
  asset_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_tier ON videos(tier);
CREATE INDEX IF NOT EXISTS idx_videos_category_episode ON videos(category, episode_number);

-- Seed data: All 50+ videos from Outerfields platform
-- Tier system:
--   'free': 5 trailers + 5 first episodes (10 total)
--   'preview': Episodes 2+ that show 30-60 second preview then gate (~40 videos)
--   'gated': Currently same as preview (future: could be different access levels)

-- Crew Call (20+ episodes)
INSERT INTO videos (id, title, category, episode_number, tier, duration, asset_path, thumbnail_path, description, created_at, updated_at) VALUES
  ('vid_crew_call_1', 'Crew Call - Episode 1', 'crew-call', 1, 'free', 1200, '/videos/crew-call/ep01.mp4', '/thumbnails/crew-call/ep01.jpg', 'First episode of Crew Call series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_2', 'Crew Call - Episode 2', 'crew-call', 2, 'preview', 1320, '/videos/crew-call/ep02.mp4', '/thumbnails/crew-call/ep02.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_3', 'Crew Call - Episode 3', 'crew-call', 3, 'preview', 1150, '/videos/crew-call/ep03.mp4', '/thumbnails/crew-call/ep03.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_4', 'Crew Call - Episode 4', 'crew-call', 4, 'preview', 1280, '/videos/crew-call/ep04.mp4', '/thumbnails/crew-call/ep04.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_5', 'Crew Call - Episode 5', 'crew-call', 5, 'preview', 1190, '/videos/crew-call/ep05.mp4', '/thumbnails/crew-call/ep05.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_6', 'Crew Call - Episode 6', 'crew-call', 6, 'preview', 1245, '/videos/crew-call/ep06.mp4', '/thumbnails/crew-call/ep06.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_7', 'Crew Call - Episode 7', 'crew-call', 7, 'preview', 1310, '/videos/crew-call/ep07.mp4', '/thumbnails/crew-call/ep07.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_8', 'Crew Call - Episode 8', 'crew-call', 8, 'preview', 1175, '/videos/crew-call/ep08.mp4', '/thumbnails/crew-call/ep08.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_9', 'Crew Call - Episode 9', 'crew-call', 9, 'preview', 1260, '/videos/crew-call/ep09.mp4', '/thumbnails/crew-call/ep09.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_10', 'Crew Call - Episode 10', 'crew-call', 10, 'preview', 1200, '/videos/crew-call/ep10.mp4', '/thumbnails/crew-call/ep10.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_11', 'Crew Call - Episode 11', 'crew-call', 11, 'preview', 1285, '/videos/crew-call/ep11.mp4', '/thumbnails/crew-call/ep11.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_12', 'Crew Call - Episode 12', 'crew-call', 12, 'preview', 1220, '/videos/crew-call/ep12.mp4', '/thumbnails/crew-call/ep12.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_13', 'Crew Call - Episode 13', 'crew-call', 13, 'preview', 1195, '/videos/crew-call/ep13.mp4', '/thumbnails/crew-call/ep13.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_14', 'Crew Call - Episode 14', 'crew-call', 14, 'preview', 1270, '/videos/crew-call/ep14.mp4', '/thumbnails/crew-call/ep14.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_15', 'Crew Call - Episode 15', 'crew-call', 15, 'preview', 1240, '/videos/crew-call/ep15.mp4', '/thumbnails/crew-call/ep15.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_16', 'Crew Call - Episode 16', 'crew-call', 16, 'preview', 1210, '/videos/crew-call/ep16.mp4', '/thumbnails/crew-call/ep16.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_17', 'Crew Call - Episode 17', 'crew-call', 17, 'preview', 1255, '/videos/crew-call/ep17.mp4', '/thumbnails/crew-call/ep17.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_18', 'Crew Call - Episode 18', 'crew-call', 18, 'preview', 1230, '/videos/crew-call/ep18.mp4', '/thumbnails/crew-call/ep18.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_19', 'Crew Call - Episode 19', 'crew-call', 19, 'preview', 1265, '/videos/crew-call/ep19.mp4', '/thumbnails/crew-call/ep19.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_crew_call_20', 'Crew Call - Episode 20', 'crew-call', 20, 'preview', 1290, '/videos/crew-call/ep20.mp4', '/thumbnails/crew-call/ep20.jpg', '', strftime('%s', 'now'), strftime('%s', 'now'));

-- Reconnecting Relationships (3 episodes)
INSERT INTO videos (id, title, category, episode_number, tier, duration, asset_path, thumbnail_path, description, created_at, updated_at) VALUES
  ('vid_recon_1', 'Reconnecting Relationships - Episode 1', 'reconnecting-relationships', 1, 'free', 1400, '/videos/reconnecting/ep01.mp4', '/thumbnails/reconnecting/ep01.jpg', 'First episode of Reconnecting Relationships', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_recon_2', 'Reconnecting Relationships - Episode 2', 'reconnecting-relationships', 2, 'preview', 1350, '/videos/reconnecting/ep02.mp4', '/thumbnails/reconnecting/ep02.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_recon_3', 'Reconnecting Relationships - Episode 3', 'reconnecting-relationships', 3, 'preview', 1420, '/videos/reconnecting/ep03.mp4', '/thumbnails/reconnecting/ep03.jpg', '', strftime('%s', 'now'), strftime('%s', 'now'));

-- Kodiak (8 episodes)
INSERT INTO videos (id, title, category, episode_number, tier, duration, asset_path, thumbnail_path, description, created_at, updated_at) VALUES
  ('vid_kodiak_1', 'Kodiak - Episode 1', 'kodiak', 1, 'free', 1500, '/videos/kodiak/ep01.mp4', '/thumbnails/kodiak/ep01.jpg', 'First episode of Kodiak series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_kodiak_2', 'Kodiak - Episode 2', 'kodiak', 2, 'preview', 1450, '/videos/kodiak/ep02.mp4', '/thumbnails/kodiak/ep02.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_kodiak_3', 'Kodiak - Episode 3', 'kodiak', 3, 'preview', 1480, '/videos/kodiak/ep03.mp4', '/thumbnails/kodiak/ep03.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_kodiak_4', 'Kodiak - Episode 4', 'kodiak', 4, 'preview', 1520, '/videos/kodiak/ep04.mp4', '/thumbnails/kodiak/ep04.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_kodiak_5', 'Kodiak - Episode 5', 'kodiak', 5, 'preview', 1470, '/videos/kodiak/ep05.mp4', '/thumbnails/kodiak/ep05.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_kodiak_6', 'Kodiak - Episode 6', 'kodiak', 6, 'preview', 1490, '/videos/kodiak/ep06.mp4', '/thumbnails/kodiak/ep06.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_kodiak_7', 'Kodiak - Episode 7', 'kodiak', 7, 'preview', 1510, '/videos/kodiak/ep07.mp4', '/thumbnails/kodiak/ep07.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_kodiak_8', 'Kodiak - Episode 8', 'kodiak', 8, 'preview', 1530, '/videos/kodiak/ep08.mp4', '/thumbnails/kodiak/ep08.jpg', '', strftime('%s', 'now'), strftime('%s', 'now'));

-- Lincoln Manufacturing (8 episodes)
INSERT INTO videos (id, title, category, episode_number, tier, duration, asset_path, thumbnail_path, description, created_at, updated_at) VALUES
  ('vid_lincoln_1', 'Lincoln Manufacturing - Episode 1', 'lincoln-manufacturing', 1, 'free', 1100, '/videos/lincoln/ep01.mp4', '/thumbnails/lincoln/ep01.jpg', 'First episode of Lincoln Manufacturing', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_lincoln_2', 'Lincoln Manufacturing - Episode 2', 'lincoln-manufacturing', 2, 'preview', 1050, '/videos/lincoln/ep02.mp4', '/thumbnails/lincoln/ep02.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_lincoln_3', 'Lincoln Manufacturing - Episode 3', 'lincoln-manufacturing', 3, 'preview', 1080, '/videos/lincoln/ep03.mp4', '/thumbnails/lincoln/ep03.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_lincoln_4', 'Lincoln Manufacturing - Episode 4', 'lincoln-manufacturing', 4, 'preview', 1120, '/videos/lincoln/ep04.mp4', '/thumbnails/lincoln/ep04.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_lincoln_5', 'Lincoln Manufacturing - Episode 5', 'lincoln-manufacturing', 5, 'preview', 1070, '/videos/lincoln/ep05.mp4', '/thumbnails/lincoln/ep05.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_lincoln_6', 'Lincoln Manufacturing - Episode 6', 'lincoln-manufacturing', 6, 'preview', 1090, '/videos/lincoln/ep06.mp4', '/thumbnails/lincoln/ep06.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_lincoln_7', 'Lincoln Manufacturing - Episode 7', 'lincoln-manufacturing', 7, 'preview', 1110, '/videos/lincoln/ep07.mp4', '/thumbnails/lincoln/ep07.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_lincoln_8', 'Lincoln Manufacturing - Episode 8', 'lincoln-manufacturing', 8, 'preview', 1130, '/videos/lincoln/ep08.mp4', '/thumbnails/lincoln/ep08.jpg', '', strftime('%s', 'now'), strftime('%s', 'now'));

-- Guns Out TV (13 episodes)
INSERT INTO videos (id, title, category, episode_number, tier, duration, asset_path, thumbnail_path, description, created_at, updated_at) VALUES
  ('vid_guns_out_1', 'Guns Out TV - Episode 1', 'guns-out-tv', 1, 'free', 1800, '/videos/guns-out/ep01.mp4', '/thumbnails/guns-out/ep01.jpg', 'First episode of Guns Out TV', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_2', 'Guns Out TV - Episode 2', 'guns-out-tv', 2, 'preview', 1750, '/videos/guns-out/ep02.mp4', '/thumbnails/guns-out/ep02.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_3', 'Guns Out TV - Episode 3', 'guns-out-tv', 3, 'preview', 1780, '/videos/guns-out/ep03.mp4', '/thumbnails/guns-out/ep03.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_4', 'Guns Out TV - Episode 4', 'guns-out-tv', 4, 'preview', 1820, '/videos/guns-out/ep04.mp4', '/thumbnails/guns-out/ep04.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_5', 'Guns Out TV - Episode 5', 'guns-out-tv', 5, 'preview', 1760, '/videos/guns-out/ep05.mp4', '/thumbnails/guns-out/ep05.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_6', 'Guns Out TV - Episode 6', 'guns-out-tv', 6, 'preview', 1790, '/videos/guns-out/ep06.mp4', '/thumbnails/guns-out/ep06.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_7', 'Guns Out TV - Episode 7', 'guns-out-tv', 7, 'preview', 1810, '/videos/guns-out/ep07.mp4', '/thumbnails/guns-out/ep07.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_8', 'Guns Out TV - Episode 8', 'guns-out-tv', 8, 'preview', 1770, '/videos/guns-out/ep08.mp4', '/thumbnails/guns-out/ep08.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_9', 'Guns Out TV - Episode 9', 'guns-out-tv', 9, 'preview', 1800, '/videos/guns-out/ep09.mp4', '/thumbnails/guns-out/ep09.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_10', 'Guns Out TV - Episode 10', 'guns-out-tv', 10, 'preview', 1830, '/videos/guns-out/ep10.mp4', '/thumbnails/guns-out/ep10.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_11', 'Guns Out TV - Episode 11', 'guns-out-tv', 11, 'preview', 1785, '/videos/guns-out/ep11.mp4', '/thumbnails/guns-out/ep11.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_12', 'Guns Out TV - Episode 12', 'guns-out-tv', 12, 'preview', 1795, '/videos/guns-out/ep12.mp4', '/thumbnails/guns-out/ep12.jpg', '', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_guns_out_13', 'Guns Out TV - Episode 13', 'guns-out-tv', 13, 'preview', 1815, '/videos/guns-out/ep13.mp4', '/thumbnails/guns-out/ep13.jpg', '', strftime('%s', 'now'), strftime('%s', 'now'));

-- Films (1 film)
INSERT INTO videos (id, title, category, episode_number, tier, duration, asset_path, thumbnail_path, description, created_at, updated_at) VALUES
  ('vid_film_1', 'Featured Film', 'films', NULL, 'free', 5400, '/videos/films/featured.mp4', '/thumbnails/films/featured.jpg', 'Feature film from Outerfields', strftime('%s', 'now'), strftime('%s', 'now'));

-- Coming Soon (5 trailers - all FREE)
INSERT INTO videos (id, title, category, episode_number, tier, duration, asset_path, thumbnail_path, description, created_at, updated_at) VALUES
  ('vid_trailer_1', 'Upcoming Series - Trailer 1', 'coming-soon', NULL, 'free', 120, '/videos/trailers/trailer01.mp4', '/thumbnails/trailers/trailer01.jpg', 'Trailer for upcoming series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_trailer_2', 'Upcoming Series - Trailer 2', 'coming-soon', NULL, 'free', 135, '/videos/trailers/trailer02.mp4', '/thumbnails/trailers/trailer02.jpg', 'Trailer for upcoming series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_trailer_3', 'Upcoming Series - Trailer 3', 'coming-soon', NULL, 'free', 110, '/videos/trailers/trailer03.mp4', '/thumbnails/trailers/trailer03.jpg', 'Trailer for upcoming series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_trailer_4', 'Upcoming Series - Trailer 4', 'coming-soon', NULL, 'free', 125, '/videos/trailers/trailer04.mp4', '/thumbnails/trailers/trailer04.jpg', 'Trailer for upcoming series', strftime('%s', 'now'), strftime('%s', 'now')),
  ('vid_trailer_5', 'Upcoming Series - Trailer 5', 'coming-soon', NULL, 'free', 140, '/videos/trailers/trailer05.mp4', '/thumbnails/trailers/trailer05.jpg', 'Trailer for upcoming series', strftime('%s', 'now'), strftime('%s', 'now'));
