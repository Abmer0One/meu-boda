import type { NextConfig } from "next";
import os from "os";

const getLocalIp = (): string => {
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;
    for (const netInterface of ifaceList) {
      if (netInterface.family === 'IPv4' && !netInterface.internal) {
        localIp = netInterface.address;
        if (
          name.toLowerCase().includes('wi-fi') ||
          name.toLowerCase().includes('wlan') ||
          name.toLowerCase().includes('ethernet')
        ) {
          return localIp;
        }
      }
    }
  }
  return localIp;
};

const localIp = getLocalIp();

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [localIp, 'localhost:3000', `${localIp}:3000`],
};

export default nextConfig;
