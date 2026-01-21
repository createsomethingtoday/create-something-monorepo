//! Scenario Framework
//!
//! Provides time-aware simulation scaffolding.
//! Each vertical (dental, writer, agency) implements Scenario.

use crate::{SimState, Rng};

/// Time of day affects behavior patterns
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimeOfDay {
    /// 6am - 9am: Opening, preparation
    EarlyMorning,
    /// 9am - 12pm: Peak activity
    Morning,
    /// 12pm - 2pm: Lunch lull
    Midday,
    /// 2pm - 5pm: Afternoon steady
    Afternoon,
    /// 5pm - 7pm: Closing rush
    LateAfternoon,
    /// 7pm - 6am: Closed/minimal
    Evening,
}

impl TimeOfDay {
    /// Determine time of day from hour (0-23)
    pub fn from_hour(hour: u32) -> Self {
        match hour {
            6..=8 => TimeOfDay::EarlyMorning,
            9..=11 => TimeOfDay::Morning,
            12..=13 => TimeOfDay::Midday,
            14..=16 => TimeOfDay::Afternoon,
            17..=18 => TimeOfDay::LateAfternoon,
            _ => TimeOfDay::Evening,
        }
    }

    /// Get the "business progress" (0.0 = start of day, 1.0 = end of day)
    pub fn business_progress(&self, minute_of_day: u32) -> f64 {
        // Business hours: 8am (480) to 6pm (1080) = 600 minutes
        let start = 480u32;
        let end = 1080u32;
        
        if minute_of_day < start {
            0.0
        } else if minute_of_day > end {
            1.0
        } else {
            (minute_of_day - start) as f64 / (end - start) as f64
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            TimeOfDay::EarlyMorning => "early_morning",
            TimeOfDay::Morning => "morning",
            TimeOfDay::Midday => "midday",
            TimeOfDay::Afternoon => "afternoon",
            TimeOfDay::LateAfternoon => "late_afternoon",
            TimeOfDay::Evening => "evening",
        }
    }
}

/// Time utilities for simulation
pub struct SimTime {
    /// Unix timestamp in milliseconds
    pub timestamp_ms: i64,
    /// Hour of day (0-23)
    pub hour: u32,
    /// Minute of day (0-1439)
    pub minute_of_day: u32,
    /// Day of week (0 = Sunday, 6 = Saturday)
    pub day_of_week: u32,
    /// Time of day enum
    pub time_of_day: TimeOfDay,
    /// Business progress (0.0 - 1.0)
    pub business_progress: f64,
}

impl SimTime {
    pub fn from_timestamp_ms(timestamp_ms: i64) -> Self {
        // Convert to seconds
        let ts_secs = timestamp_ms / 1000;
        
        // Simulate US Central timezone (UTC-6) for realistic demo business hours
        // This ensures viewers see the practice "during the day" at reasonable US times
        let tz_offset_secs = -6 * 3600i64; // CST
        let local_ts_secs = ts_secs + tz_offset_secs;
        
        let secs_in_day = 86400i64;
        let day_secs = ((local_ts_secs % secs_in_day) + secs_in_day) % secs_in_day;
        
        let hour = (day_secs / 3600) as u32;
        let minute_of_day = (day_secs / 60) as u32;
        
        // Day of week (Jan 1, 1970 was Thursday = 4)
        let days_since_epoch = local_ts_secs / secs_in_day;
        let day_of_week = (((days_since_epoch + 4) % 7 + 7) % 7) as u32;
        
        let time_of_day = TimeOfDay::from_hour(hour);
        let business_progress = time_of_day.business_progress(minute_of_day);
        
        SimTime {
            timestamp_ms,
            hour,
            minute_of_day,
            day_of_week,
            time_of_day,
            business_progress,
        }
    }

    /// Is this a weekday?
    pub fn is_weekday(&self) -> bool {
        self.day_of_week >= 1 && self.day_of_week <= 5
    }

    /// Is this during business hours?
    pub fn is_business_hours(&self) -> bool {
        self.hour >= 8 && self.hour < 18
    }
}

/// Trait for scenario implementations
pub trait Scenario {
    /// Generate the complete state at a given time
    fn generate(seed: u64, timestamp_ms: i64) -> SimState;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_of_day() {
        assert_eq!(TimeOfDay::from_hour(7), TimeOfDay::EarlyMorning);
        assert_eq!(TimeOfDay::from_hour(10), TimeOfDay::Morning);
        assert_eq!(TimeOfDay::from_hour(12), TimeOfDay::Midday);
        assert_eq!(TimeOfDay::from_hour(15), TimeOfDay::Afternoon);
        assert_eq!(TimeOfDay::from_hour(17), TimeOfDay::LateAfternoon);
        assert_eq!(TimeOfDay::from_hour(20), TimeOfDay::Evening);
    }

    #[test]
    fn test_business_progress() {
        let tod = TimeOfDay::Morning;
        
        // 8am = 0%
        assert!((tod.business_progress(480) - 0.0).abs() < 0.01);
        
        // 1pm (780) = 50%
        assert!((tod.business_progress(780) - 0.5).abs() < 0.01);
        
        // 6pm = 100%
        assert!((tod.business_progress(1080) - 1.0).abs() < 0.01);
    }
}
