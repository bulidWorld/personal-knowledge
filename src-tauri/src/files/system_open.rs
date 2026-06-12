use std::{path::Path, process::Command};

use crate::error::{CommandError, CommandResult};

pub fn open_with_default_app(path: &Path) -> CommandResult<()> {
    #[cfg(target_os = "windows")]
    let status = {
        let path = path.to_string_lossy().to_string();
        Command::new("cmd")
            .args(["/C", "start", ""])
            .arg(path)
            .status()
    };

    #[cfg(target_os = "macos")]
    let status = Command::new("open").arg(path).status();

    #[cfg(all(unix, not(target_os = "macos")))]
    let status = Command::new("xdg-open").arg(path).status();

    status
        .map_err(|_| CommandError::file_open("调用系统默认程序失败"))?
        .success()
        .then_some(())
        .ok_or_else(|| CommandError::file_open("系统默认程序打开文件失败"))
}
