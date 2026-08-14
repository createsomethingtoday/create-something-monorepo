use tokio::net::TcpListener;
use workway_edge::{threshold_dwelling_vault, vault_router, EdgeRuntimeConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let runtime = EdgeRuntimeConfig::from_environment()?;
    let vault = threshold_dwelling_vault(runtime.vault)?;
    let listener = TcpListener::bind(runtime.bind_addr).await?;
    axum::serve(listener, vault_router(vault).into_make_service()).await?;
    Ok(())
}
