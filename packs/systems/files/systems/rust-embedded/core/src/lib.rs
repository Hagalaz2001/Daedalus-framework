//! Hardware-independent firmware logic. `no_std`, no allocation, tested on the host with `cargo test`.
#![cfg_attr(not(test), no_std)]

/// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF, no reflection). Check value for "123456789" is 0x29B1.
pub fn crc16_ccitt(data: &[u8]) -> u16 {
    let mut crc: u16 = 0xFFFF;
    for &byte in data {
        crc ^= (byte as u16) << 8;
        for _ in 0..8 {
            crc = if crc & 0x8000 != 0 { (crc << 1) ^ 0x1021 } else { crc << 1 };
        }
    }
    crc
}

/// Debounces a noisy digital input: the output changes only after `threshold` identical samples in a row.
pub struct Debouncer {
    stable: bool,
    candidate: bool,
    count: u8,
    threshold: u8,
}

impl Debouncer {
    pub const fn new(threshold: u8, initial: bool) -> Self {
        Self { stable: initial, candidate: initial, count: 0, threshold }
    }

    /// Feed one sample; returns the debounced state.
    pub fn update(&mut self, sample: bool) -> bool {
        if sample == self.stable {
            self.count = 0;
            self.candidate = sample;
        } else if sample == self.candidate {
            self.count = self.count.saturating_add(1);
            if self.count >= self.threshold {
                self.stable = sample;
                self.count = 0;
            }
        } else {
            self.candidate = sample;
            self.count = 1;
            if self.count >= self.threshold {
                self.stable = sample;
                self.count = 0;
            }
        }
        self.stable
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crc_matches_the_published_check_value() {
        assert_eq!(crc16_ccitt(b"123456789"), 0x29B1);
        assert_eq!(crc16_ccitt(b""), 0xFFFF);
    }

    #[test]
    fn debouncer_ignores_glitches_and_accepts_stable_changes() {
        let mut d = Debouncer::new(3, false);
        assert!(!d.update(true)); // glitch
        assert!(!d.update(false));
        assert!(!d.update(true));
        assert!(!d.update(true));
        assert!(d.update(true)); // third identical sample flips it
        assert!(d.update(true));
        assert!(d.update(false)); // single low does not flip back
        assert!(d.update(true));
    }

    #[test]
    fn threshold_one_follows_the_input() {
        let mut d = Debouncer::new(1, false);
        assert!(d.update(true));
        assert!(!d.update(false));
    }
}
