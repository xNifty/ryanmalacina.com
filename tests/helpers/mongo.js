import os from "os";

// mongodb 7.7+ loads its os adapter through a dynamic import(), which Jest's VM sandbox rejects
// without --experimental-vm-modules. The driver then sends an empty handshake and mongod refuses it
// ("Missing required sub-document 'driver'"), so hand it the os module directly.
export const testConnectOptions = { runtimeAdapters: { os } };
