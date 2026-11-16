#![no_std]
#![no_main]

use embassy_executor::Spawner;
use embassy_stm32::gpio::{Input, Level, Output, Pull, Speed};
use embassy_time::Timer;
use fw_core::Debouncer;
use panic_halt as _;

#[embassy_executor::main]
async fn main(_spawner: Spawner) {
    let p = embassy_stm32::init(Default::default());
    let mut led = Output::new(p.PA5, Level::Low, Speed::Low);
    let button = Input::new(p.PC13, Pull::Up);
    let mut debounce = Debouncer::new(5, false);
    loop {
        let pressed = debounce.update(button.is_low());
        led.set_level(if pressed { Level::High } else { Level::Low });
        Timer::after_millis(10).await;
    }
}
