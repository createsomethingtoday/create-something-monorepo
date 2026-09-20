CREATE TABLE impact_daily (
  day TEXT NOT NULL,
  surface TEXT NOT NULL,
  event TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,surface,event)
);
CREATE TABLE network_impact_daily (
 day TEXT NOT NULL,network_id TEXT NOT NULL REFERENCES networks(id),event TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,network_id,event)
);
