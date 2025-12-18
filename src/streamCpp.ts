import dotenv from "dotenv";
import protobuf from "protobufjs";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import type {
  StreamCppRequest,
  StreamCppResult,
  ProtoType,
} from "./types/proto";
import { defaultStreamCppPayload } from "./constants";

dotenv.config();

async function sendStreamCppRequest(): Promise<void> {
  const token = process.env.CURSOR_BEARER_TOKEN;
  if (!token || token === "undefined") {
    console.error(
      "Missing CURSOR_BEARER_TOKEN. dotenv loaded 0 vars; set it in your shell or .env."
    );
    process.exit(1);
  }

  const requestRoot = await protobuf.load("./protobuf/streamCppRequest.proto");
  const Request = requestRoot.lookupType(
    "aiserver.v1.StreamCppRequest"
  ) as unknown as ProtoType;

  const responseRoot = await protobuf.load(
    "./protobuf/streamCppResponse.proto"
  );
  const Response = responseRoot.lookupType(
    "aiserver.v1.StreamCppResponse"
  ) as unknown as ProtoType;

  const payload: StreamCppRequest = defaultStreamCppPayload;

  const protoBuffer = Buffer.from(
    Request.encode(Request.create(payload)).finish()
  );

  const envelope = Buffer.alloc(5 + protoBuffer.length);
  envelope.writeUInt8(0, 0);
  envelope.writeUInt32BE(protoBuffer.length, 1);
  protoBuffer.copy(envelope, 5);

  const url = new URL(
    "https://us-only.gcpp.cursor.sh:443/aiserver.v1.AiService/StreamCpp"
  );

  const options: https.RequestOptions = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: "POST",
    headers: {
      "connect-accept-encoding": "gzip",
      "connect-content-encoding": "gzip",
      "connect-protocol-version": "1",
      "content-type": "application/connect+proto",
      "x-cursor-client-type": "ide",
      "x-cursor-client-version": process.env.X_CURSOR_CLIENT_VERSION ?? "",
      "x-cursor-streaming": "true",
      "x-request-id": process.env.X_REQUEST_ID ?? "",
      "x-session-id": process.env.X_SESSION_ID ?? "",
      Authorization: `Bearer ${token}`,
      "Content-Length": envelope.length,
    },
  };

  const req = https.request(options, (res: IncomingMessage) => {
    let dataBuffer = Buffer.alloc(0);

    // Collect all stream data
    const result: StreamCppResult = {
      status: res.statusCode,
      contentType: res.headers["content-type"] ?? "",
      modelInfo: null,
      rangeToReplace: null,
      text: "",
      doneEdit: false,
      doneStream: false,
      debug: null,
      trailer: null,
      error: null,
    };

    res.on("data", (chunk: Buffer) => {
      dataBuffer = Buffer.concat([dataBuffer, chunk]);

      // Parse Connect protocol envelopes: 1 byte flags + 4 bytes length + message
      while (dataBuffer.length >= 5) {
        const flags = dataBuffer.readUInt8(0);
        const msgLen = dataBuffer.readUInt32BE(1);

        // Check if we have the full message
        if (dataBuffer.length < 5 + msgLen) {
          break; // Wait for more data
        }

        const msgData = dataBuffer.slice(5, 5 + msgLen);
        dataBuffer = dataBuffer.slice(5 + msgLen);

        // flags & 0x02 means it's a trailer/end-stream frame (JSON)
        if (flags & 0x02) {
          try {
            result.trailer = JSON.parse(msgData.toString("utf8")) as unknown;
          } catch {
            result.trailer = msgData.toString("utf8");
          }
          continue;
        }

        // Regular data frame - decode protobuf
        try {
          const decoded = Response.decode(msgData) as {
            modelInfo?: StreamCppResult["modelInfo"];
            rangeToReplace?: StreamCppResult["rangeToReplace"];
            text?: string;
            doneEdit?: boolean;
            doneStream?: boolean;
            debugModelOutput?: string;
            debugModelInput?: string;
            debugStreamTime?: string;
            debugTtftTime?: string;
          };

          if (decoded.modelInfo) {
            result.modelInfo = decoded.modelInfo;
          }
          if (decoded.rangeToReplace) {
            result.rangeToReplace = decoded.rangeToReplace;
          }
          if (decoded.text) {
            result.text += decoded.text;
          }
          if (decoded.doneEdit) {
            result.doneEdit = true;
          }
          if (decoded.doneStream) {
            result.doneStream = true;
          }
          if (decoded.debugModelOutput || decoded.debugStreamTime) {
            result.debug = {
              modelOutput: decoded.debugModelOutput,
              modelInput: decoded.debugModelInput,
              streamTime: decoded.debugStreamTime,
              ttftTime: decoded.debugTtftTime,
            };
          }
        } catch (e) {
          const error = e as Error;
          result.error = error.message;
        }
      }
    });

    res.on("end", () => {
      // Handle any remaining data as error response
      if (dataBuffer.length > 0) {
        const contentType = res.headers["content-type"] ?? "";
        if (
          contentType.includes("application/json") ||
          dataBuffer[0] === 0x7b
        ) {
          try {
            result.error = JSON.parse(dataBuffer.toString("utf8")) as unknown;
          } catch {
            result.error = dataBuffer.toString("utf8");
          }
        }
      }

      // Output final JSON
      console.log(JSON.stringify(result, null, 2));
    });

    res.on("error", (err: Error) => {
      result.error = err.message;
      console.log(JSON.stringify(result, null, 2));
    });
  });

  req.on("error", (err: Error) => {
    console.error("Request error:", err.message);
  });

  req.write(envelope);
  req.end();
}

sendStreamCppRequest();
