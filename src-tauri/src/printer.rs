use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream};
use std::time::Duration;
use tokio::net::TcpStream as TokioTcpStream;
use tokio::io::AsyncWriteExt;
use local_ip_address::local_ip;
use serde::{Deserialize, Serialize};
use image::{DynamicImage, GenericImageView, Luma};
use std::io::Cursor;

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscoveredPrinter {
    pub ip: String,
    pub port: u16,
}

#[tauri::command]
pub async fn scan_network_printers() -> Result<Vec<DiscoveredPrinter>, String> {
    let my_local_ip = local_ip().map_err(|e| e.to_string())?;
    
    let ip_bytes = match my_local_ip {
        IpAddr::V4(v4) => v4.octets(),
        _ => return Err("Only IPv4 is supported for scanning".to_string()),
    };

    let mut found_printers = Vec::new();
    let mut tasks = Vec::new();

    // Scan the /24 subnet (e.g., 192.168.1.1 to 192.168.1.254)
    for i in 1..255 {
        if i == ip_bytes[3] {
            continue; // Skip self
        }
        
        let target_ip = Ipv4Addr::new(ip_bytes[0], ip_bytes[1], ip_bytes[2], i);
        let target_addr = SocketAddr::new(IpAddr::V4(target_ip), 9100);

        let task = tokio::spawn(async move {
            match tokio::time::timeout(Duration::from_millis(200), TokioTcpStream::connect(target_addr)).await {
                Ok(Ok(_)) => Some(DiscoveredPrinter {
                    ip: target_ip.to_string(),
                    port: 9100,
                }),
                _ => None,
            }
        });
        tasks.push(task);
    }

    for task in tasks {
        if let Ok(Some(printer)) = task.await {
            found_printers.push(printer);
        }
    }

    Ok(found_printers)
}

#[tauri::command]
pub async fn print_raw_to_network(ip: String, port: u16, data: Vec<u8>) -> Result<(), String> {
    let addr = format!("{}:{}", ip, port);
    let mut stream = TokioTcpStream::connect(&addr).await.map_err(|e| format!("Failed to connect to printer at {}: {}", addr, e))?;
    
    stream.write_all(&data).await.map_err(|e| format!("Failed to send data to printer: {}", e))?;
    stream.flush().await.map_err(|e| format!("Failed to flush printer stream: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn print_logo_to_network(ip: String, port: u16, url: String) -> Result<(), String> {
    // 1. Download image
    let response = reqwest::get(&url).await.map_err(|e| format!("Failed to download logo: {}", e))?;
    let bytes = response.bytes().await.map_err(|e| format!("Failed to read logo bytes: {}", e))?;
    
    // 2. Decode image
    let img = image::load_from_memory(&bytes).map_err(|e| format!("Failed to decode logo image: {}", e))?;
    
    // 3. Process image for thermal printing
    // Target width: 384 dots (standard for 58mm) or 576 dots (standard for 80mm)
    // We'll use 384 as a safe default or detect from some setting if possible.
    // For now, let's use 384 to be safe.
    let target_width = 384;
    let (width, height) = img.dimensions();
    let target_height = (height as f32 * (target_width as f32 / width as f32)) as u32;
    
    let resized = img.resize(target_width, target_height, image::imageops::FilterType::Lanczos3);
    let gray = resized.to_luma8();
    
    // 4. Convert to ESC/POS Bit Image (GS v 0)
    // GS v 0 m xL xH yL yH d1...dk
    // m = 0 (Normal)
    // xL xH = width in bytes (target_width / 8)
    // yL yH = height in dots
    let width_bytes = (target_width + 7) / 8;
    let mut esc_pos_data = vec![
        0x1D, 0x76, 0x30, 0x00, // GS v 0 0
        (width_bytes % 256) as u8, (width_bytes / 256) as u8, // xL xH
        (target_height % 256) as u8, (target_height / 256) as u8, // yL yH
    ];
    
    for y in 0..target_height {
        for x_byte in 0..width_bytes {
            let mut byte = 0u8;
            for bit in 0..8 {
                let x = x_byte * 8 + bit;
                if x < target_width {
                    let pixel = gray.get_pixel(x, y);
                    if pixel[0] < 128 { // Threshold
                        byte |= 1 << (7 - bit);
                    }
                }
            }
            esc_pos_data.push(byte);
        }
    }
    
    // 5. Send to printer
    let addr = format!("{}:{}", ip, port);
    let mut stream = TokioTcpStream::connect(&addr).await.map_err(|e| format!("Failed to connect to printer at {}: {}", addr, e))?;
    stream.write_all(&esc_pos_data).await.map_err(|e| format!("Failed to send logo data: {}", e))?;
    stream.write_all(&[0x0A]).await.map_err(|e| format!("Failed to send newline after logo: {}", e))?; // LF
    stream.flush().await.map_err(|e| format!("Failed to flush printer stream: {}", e))?;

    Ok(())
}
