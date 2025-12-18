require("dotenv").config();
const protobuf = require("protobufjs");
const https = require("https");

async function sendStreamCppRequest() {
  const token = process.env.CURSOR_BEARER_TOKEN;
  if (!token || token === "undefined") {
    console.error(
      "Missing CURSOR_BEARER_TOKEN. dotenv loaded 0 vars; set it in your shell or .env."
    );
    process.exit(1);
  }

  const requestRoot = await protobuf.load("./protobuf/streamCppRequest.proto");
  const Request = requestRoot.lookupType("aiserver.v1.StreamCppRequest");

  const responseRoot = await protobuf.load(
    "./protobuf/streamCppResponse.proto"
  );
  const Response = responseRoot.lookupType("aiserver.v1.StreamCppResponse");

  const payload = {
    isDebug: false,
    giveDebugOutput: false,
    supportsCpt: false,
    supportsCrlfCpt: false,
    currentFile: {
      relativeWorkspacePath: "Untitled-1",
      contents: "function ",
      cursorPosition: { line: 0, column: 1 },
      dataframes: [],
      languageId: "javascript",
      diagnostics: [],
      totalNumberOfLines: 0,
      contentsStartAtLine: 0,
      topChunks: [],
      fileVersion: 2,
      cellStartLines: [],
      cells: [],
      relyOnFilesync: false,
      workspaceRootPath: "",
      lineEnding: "\\n",
    },
    diffHistory: [],
    modelName: "fast",
    diffHistoryKeys: [],
    fileDiffHistories: [
      {
        fileName: "Untitled-1",
        diffHistory: ["1+| \\n"],
        diffHistoryTimestamps: [],
      },
    ],
    mergedDiffHistories: [],
    blockDiffPatches: [],
    contextItems: [],
    parameterHints: [],
    lspContexts: [],
    cppIntentInfo: { source: "line_change" },
    workspaceId: "",
    additionalFiles: [],
    clientTime: Date.now(),
    filesyncUpdates: [],
    timeSinceRequestStart: Date.now() - startTime,
    timeAtRequestSend: Date.now(),
    clientTimezoneOffset: new Date().getTimezoneOffset(),
    lspSuggestedItems: { suggestions: [] },
    codeResults: [],
  };

  const protoBuffer = Request.encode(Request.create(payload)).finish();

  const envelope = Buffer.alloc(5 + protoBuffer.length);
  envelope.writeUInt8(0, 0);
  envelope.writeUInt32BE(protoBuffer.length, 1);
  protoBuffer.copy(envelope, 5);

  const url = new URL(
    "https://us-only.gcpp.cursor.sh:443/aiserver.v1.AiService/StreamCpp"
  );

  const options = {
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
      "x-cursor-client-version": process.env.X_CURSOR_CLIENT_VERSION,
      "x-cursor-streaming": "true",
      "x-request-id": process.env.X_REQUEST_ID,
      "x-session-id": process.env.X_SESSION_ID,
      Authorization: `Bearer ${token}`,
      "Content-Length": envelope.length,
    },
  };

  const req = https.request(options, (res) => {
    let dataBuffer = Buffer.alloc(0);

    // Collect all stream data
    const result = {
      status: res.statusCode,
      contentType: res.headers["content-type"] || "",
      modelInfo: null,
      rangeToReplace: null,
      text: "",
      doneEdit: false,
      doneStream: false,
      debug: null,
      trailer: null,
      error: null,
    };

    res.on("data", (chunk) => {
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
            result.trailer = JSON.parse(msgData.toString("utf8"));
          } catch (e) {
            result.trailer = msgData.toString("utf8");
          }
          continue;
        }

        // Regular data frame - decode protobuf
        try {
          const decoded = Response.decode(msgData);

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
          result.error = e.message;
        }
      }
    });

    res.on("end", () => {
      // Handle any remaining data as error response
      if (dataBuffer.length > 0) {
        const contentType = res.headers["content-type"] || "";
        if (
          contentType.includes("application/json") ||
          dataBuffer[0] === 0x7b
        ) {
          try {
            result.error = JSON.parse(dataBuffer.toString("utf8"));
          } catch (e) {
            result.error = dataBuffer.toString("utf8");
          }
        }
      }

      // Output final JSON
      console.log(JSON.stringify(result, null, 2));
    });

    res.on("error", (err) => {
      result.error = err.message;
      console.log(JSON.stringify(result, null, 2));
    });
  });

  req.on("error", (err) => {
    console.error("Request error:", err.message);
  });

  req.write(envelope);
  req.end();
}

sendStreamCppRequest();
