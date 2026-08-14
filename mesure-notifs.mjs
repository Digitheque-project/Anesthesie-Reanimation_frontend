import { io } from 'socket.io-client'

const WS = 'https://notification-back-xrl2.onrender.com'
const SERVICE_ID = '76dfc2ed-7d3e-4317-b49a-9404dcaf56a3'

const socket = io(`${WS}/notifications`, {
  query: { serviceId: SERVICE_ID },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
})

socket.on('connect', () => console.log('CONNECTÉ'))

let n = 0
socket.on('notification', (evt) => {
  n++
  if (n <= 8) {
    console.log(JSON.stringify(evt))
  }
})

setTimeout(() => {
  console.log(`--- reçus=${n} ---`)
  socket.disconnect()
  process.exit(0)
}, 30000)
