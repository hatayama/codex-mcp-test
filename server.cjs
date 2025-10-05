const net = require('net');

const host = '127.0.0.1';
const port = Number(process.env.PORT || 8700);

const server = net.createServer((socket) => {
  // Handle socket errors to prevent server crash
  socket.on('error', (err) => {
    console.error('SOCKET_ERROR', err && (err.code || err.message));
  });
  
  // Echo a greeting then end; minimal accept behavior
  socket.write('hello');
  socket.end();
});

server.on('error', (err) => {
  console.error('SERVER_ERROR', err && (err.code || err.message));
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`SERVER_LISTENING ${host}:${port}`);
});


