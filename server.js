require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const SHEET_ID = "1-c2zcJPV4KNxZSuOWoYlbs3vqyVW08HUogUJWW0eN9w";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets"
  ]
});
/* =========================
   SHEET AUTO CREATE
========================= */
async function ensureSheet(name, header = []) {

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID
  });

  const exists = meta.data.sheets.some(
    s => s.properties.title === name
  );

  if (!exists) {

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: name }
          }
        }]
      }
    });

    if (header.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${name}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [header] }
      });
    }
  }
}

/* =========================
   SCHEMA
========================= */
const MOVEMENT_SCHEMA = [
  "movement_id","type","ref_no","date",
  "code","name","qty","unit",
  "lot","exp","target","user",
  "time","remark","location","qrcode"
];

function mapRow(row) {
  const obj = {};
  MOVEMENT_SCHEMA.forEach((k,i)=>obj[k]=row[i]??null);
  obj.qty = Number(obj.qty || 0);
  return obj;
}


app.get("/api/users", async (req, res) => {

  try {

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "USERS!A:A"
    });

    const rows = result.data.values || [];

    console.log("RAW USERS:", rows); // 👈 debug สำคัญ

    if (!rows.length) {
      return res.json([]);
    }

    const users = rows
      .flat()
      .filter(u => u && u !== "USER");

    res.json(users);

  } catch (err) {
    console.error("USER API ERROR:", err);
    res.status(500).json([]);
  }
});

app.get("/api/session/new", async (req, res) => {

  try {

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const today = new Date();
    const dateStr =
      today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    // ดึง session ทั้งหมด
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "COUNT_SESSION!A:A"
    });

    const rows = result.data.values || [];

    // หา session วันนี้
    const todaySessions = rows
      .flat()
      .filter(v => v && v.includes(`S${dateStr}`));

    // หา running number
    let next = todaySessions.length + 1;

    const session_id =
      `S${dateStr}-` + String(next).padStart(3, "0");

    res.json({ session_id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "generate failed" });
  }
});

/* =========================
   MOVEMENT API
========================= */
app.get("/api/movement/:id", async (req, res) => {

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "INVENTORY_MOVEMENT!A:P"
  });

  const rows = result.data.values || [];

  const found = rows.find(r => r[0] === req.params.id);

  if (!found) return res.status(404).json({ error: "not found" });

  res.json(mapRow(found));
});

/* =========================
   COUNT SESSION SAVE
========================= */
app.post("/api/count", async (req, res) => {

  await ensureSheet("COUNT_SESSION", [
    "SESSION_ID","MOVEMENT_ID","CODE","NAME","QTY","USER","TIME"
  ]);

  const items = req.body;

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const rows = items.map(i => ([
    i.session_id,
    i.movement_id,
    i.code,
    i.name,
    i.qty,
    i.user,
    new Date().toISOString()
  ]));

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "COUNT_SESSION!A:G",
    valueInputOption: "RAW",
    requestBody: { values: rows }
  });

  res.json({ success: true });
});

/* =========================
   GET SESSION
========================= */
app.get("/api/session/:sid", async (req, res) => {

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "COUNT_SESSION!A:G"
  });

  const rows = result.data.values || [];

  res.json(
    rows
      .filter(r => r[0] === req.params.sid)
      .map(r => ({
        session_id: r[0],
        movement_id: r[1],
        code: r[2],
        name: r[3],
        qty: Number(r[4]),
        user: r[5],
        time: r[6]
      }))
  );
});

/* =========================
   CLOSE SESSION (DIFF)
========================= */
app.post("/api/close", async (req, res) => {

  const session_id = req.body.session_id;

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const master = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "INVENTORY_MASTER!A:D"
  });

  const session = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "COUNT_SESSION!A:G"
  });

  const m = master.data.values || [];
  const s = session.data.values || [];

  await ensureSheet("SESSION_RESULT", [
    "SESSION","CODE","REQUIRED","ACTUAL","DIFF"
  ]);

  const result = [];

  m.forEach(r => {

    const code = r[0];
    const required = Number(r[3]);

    const actual = s
      .filter(x => x[0] === session_id && x[2] === code)
      .reduce((sum, x) => sum + Number(x[4]), 0);

    result.push([
      session_id,
      code,
      required,
      actual,
      actual - required
    ]);
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "SESSION_RESULT!A:E",
    valueInputOption: "RAW",
    requestBody: { values: result }
  });

  res.json({ success: true, result });
});

const PORT = process.env.PORT || 3009;

app.listen(PORT, () => {
  console.log(`RUN PORT ${PORT}`);
});