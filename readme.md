# MySQL Explorer MCP Server

Implementasi **Model Context Protocol (MCP)** yang memungkinkan Claude Desktop untuk berinteraksi langsung dengan database MySQL Anda. Server ini menyediakan tool untuk membaca seluruh skema dan data tabel secara otomatis.



---

## 🚀 Fitur Utama

* **Schema Discovery**: Mendeteksi semua tabel dan struktur kolom secara otomatis.
* **Full Data Retrieval**: Mengambil seluruh baris data dari database untuk dianalisis oleh Claude.
* **Deep Integration**: Berjalan sebagai sidecar process untuk Claude Desktop.

---

## 🛠 Prasyarat

Sebelum memulai, pastikan perangkat Anda sudah terpasang:
* **Node.js** (v18 atau lebih baru)
* **MySQL Server** (Lokal atau Remote)
* **Claude Desktop App** (Versi terbaru)

---

## 📦 Instalasi

1.  **Clone atau Masuk ke Direktori Proyek:**
    ```bash
    cd path/to/your/mysql-mcp-server
    ```

2.  **Instal Dependensi:**
    ```bash
    npm install
    ```

3.  **Build Proyek (Compile TypeScript ke JS):**
    ```bash
    npm run build
    ```

---

## ⚙️ Konfigurasi Claude Desktop

Untuk menghubungkan server ini, Anda harus mengedit file `claude_desktop_config.json`.

**Lokasi File Konfigurasi:**
* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Tambahkan konfigurasi berikut:**

```json
{
  "mcpServers": {
    "mysql-explorer": {
      "command": "node",
      "args": ["C:/absolute/path/to/your/project/build/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "3306",
        "DB_USER": "root",
        "DB_PASSWORD": "your_password",
        "DB_NAME": "your_database_name"
      }
    }
  }
}