-- Historical aggregates cannot be attributed safely; retain them separately.
CREATE TABLE customer_impact_daily (
 day TEXT NOT NULL,surface TEXT NOT NULL,event TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,surface,event)
);
