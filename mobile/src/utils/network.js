export const discoverServerIP = async () => {
  const commonIPs = [
    '192.168.1.100',    // Common home network
    '192.168.0.100',    // Alternative home network
    '10.0.2.2',         // Android emulator
    'localhost',         // Fallback
  ];

  // Add your computer name for mDNS (iOS)
  const computerName = 'your-computer-name'; // Ganti dengan nama komputer Anda
  
  const testUrls = [
    ...commonIPs.map(ip => `http://${ip}:5000/health`),
    `http://${computerName}.local:5000/health`, // mDNS for iOS
  ];

  for (const url of testUrls) {
    try {
      const response = await fetch(url, { timeout: 3000 });
      if (response.ok) {
        // Extract base URL from health endpoint
        return url.replace('/health', '/api');
      }
    } catch (error) {
      continue;
    }
  }

  // Return default if nothing works
  return 'http://localhost:5000/api';
};