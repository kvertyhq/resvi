use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream};
use std::time::Duration;
use tokio::net::TcpStream as TokioTcpStream;
use tokio::io::AsyncWriteExt;
use local_ip_address::local_ip;
use serde::{Deserialize, Serialize};

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
