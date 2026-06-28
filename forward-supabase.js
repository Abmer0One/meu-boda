const net = require('net');
const os = require('os');

const listenPort = 64325; 
const targetPort = 64321;
const targetHost = '127.0.0.1';

const getLocalIp = () => {
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

net.createServer((socket) => {
  const client = net.createConnection(targetPort, targetHost);
  socket.pipe(client).pipe(socket);
  
  socket.on('error', (err) => {});
  client.on('error', (err) => {});
}).listen(listenPort, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`[Meu Boda] Redirecionamento Supabase Ativo!`);
  console.log(`A escutar em: http://${localIp}:${listenPort}`);
  console.log(`A encaminhar para: http://${targetHost}:${targetPort}`);
  console.log(`======================================================\n`);
});
