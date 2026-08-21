// ─── DigiAjo Global — API Route Helper ─────────────────────────────────────
// Automatically determines the correct base URL whether running under
// root domain (e.g. digiajoglobal.com), XAMPP subdirectory (/Digiajoglobal/),
// or Vite local dev server with direct XAMPP fallback.

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const pathname = window.location.pathname

  if (pathname.toLowerCase().includes('/digiajoglobal')) {
    return `/Digiajoglobal/${cleanPath}`
  }

  // If on local dev server port (e.g. 5173, 5174), direct call to local Apache avoids proxy issues
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    if (window.location.port && window.location.port !== '80') {
      return `http://${window.location.hostname}/Digiajoglobal/${cleanPath}`
    }
  }

  return `/${cleanPath}`
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const primaryUrl = apiUrl(path)
  try {
    const res = await fetch(primaryUrl, init)
    if (res.ok || res.status < 500) return res
    throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const fallbackUrls = [
      `/Digiajoglobal/${cleanPath}`,
      `/${cleanPath}`,
      `http://localhost/Digiajoglobal/${cleanPath}`,
      `http://127.0.0.1/Digiajoglobal/${cleanPath}`,
    ]
    for (const alt of fallbackUrls) {
      if (alt === primaryUrl) continue
      try {
        const altRes = await fetch(alt, init)
        if (altRes.ok || altRes.status < 500) return altRes
      } catch {}
    }
    throw err
  }
}
