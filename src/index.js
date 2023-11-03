import { Endpoint } from "@ndn/endpoint";
import { Data, Interest } from "@ndn/packet";
import { Forwarder, FwPacket } from "@ndn/fw";
import { Encoder, Decoder } from '@ndn/tlv';
import { pushable } from "it-pushable";
import { toUtf8, fromUtf8 } from "@ndn/util";

// Initialize
const ws = new WebSocket(`ws://${location.host}/`);
const fw = Forwarder.create();
const endpoint = new Endpoint({ fw });
const remoteFaceTx = pushable({objectMode: true});
const remoteFace = fw.addFace({
    rx: remoteFaceTx,
    tx: async () => {}, // Nothing should ever be received here
});

// Listen for websocket open
ws.addEventListener("open", () => {
    console.log("websocket open");
});

// Listen for packets on websocket
ws.binaryType = "arraybuffer";
ws.addEventListener("message", async ({data}) => {
    // Decode packet
    const array = new Uint8Array(data);
    const decoder = new Decoder(array);

    let packet;

    // Get first TLV type (hack)
    const type = array[0];
    if (type === 0x06) {
        packet = decoder.decode(Data);
    } else if (type === 0x05) {
        packet = decoder.decode(Interest);
    } else {
        throw new Error(`Unknown packet type ${type}`);
    }

    // remoteFaceTx.push(new FwPacket({l3: i}));
    remoteFaceTx.push(FwPacket.create(packet))
});

fw.addEventListener("pktrx", ({face, packet}) => {
    console.log('pktrx', packet);
    if (face === remoteFace) {
        // Don't loop back
        return;
    }

    // Send packet to websocket
    const encoder = new Encoder();
    encoder.encode(packet.l3);
    const buf = encoder.output;
    ws.send(buf);
});

fw.addEventListener("pkttx", ({face, packet}) => {
    console.log('pkttx', packet);
});

async function sendInterest() {
    const res = await endpoint.consume(new Interest(`/test/${Math.random()}`));
    console.log('Consumer received data', fromUtf8(res.content));
}

function produce() {
    console.log('Starting producer')
    endpoint.produce(`/test/`, async (interest) => {
        console.log('Producer received interest', interest);
        const data = new Data(interest.name, Data.FreshnessPeriod(500));
        data.content = toUtf8("Hello from NDNts Producer");
        return data;
    });
}

globalThis.app = {
    sendInterest, produce,
}

// Monkey patch console log to append to #console
const consoleLog = console.log;
console.log = (...args) => {
    document.querySelector("#console").innerHTML += args.join(" ") + "\n";
    consoleLog(...args);
};