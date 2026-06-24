import { google } from "googleapis";

const SHEET_NAME = "EIDS_YETKILER";
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

type SheetsClient = ReturnType<typeof google.sheets>;

let clientPromise: Promise<{ sheets: SheetsClient; sheetId: string } | null> | null = null;

function buildClient(): Promise<{ sheets: SheetsClient; sheetId: string } | null> {
  if (!SERVICE_ACCOUNT_JSON) {
    console.log("Google Sheets: GOOGLE_SERVICE_ACCOUNT_JSON eksik, atlanıyor.");
    return Promise.resolve(null);
  }

  return (async () => {
    try {
      const creds = JSON.parse(SERVICE_ACCOUNT_JSON!);
      const auth = new google.auth.GoogleAuth({
        credentials: creds,
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.readonly",
        ],
      });

      const drive = google.drive({ version: "v3", auth });
      console.log(`Google Sheets: "${SHEET_NAME}" isimli spreadsheet aranıyor...`);
      const driveRes = await drive.files.list({
        q: `name = '${SHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
        fields: "files(id, name)",
        spaces: "drive",
      });

      const file = driveRes.data.files?.[0];
      if (!file?.id) {
        console.error(`Google Sheets: "${SHEET_NAME}" bulunamadı.`);
        return null;
      }

      const sheetId = file.id;
      const sheets = google.sheets({ version: "v4", auth });
      console.log(`Google Sheets: bağlandı — ID: ${sheetId.substring(0, 12)}...`);
      return { sheets, sheetId };
    } catch (e: any) {
      console.error("Google Sheets bağlantı hatası:", e.message);
      return null;
    }
  })();
}

function getClient(): Promise<{ sheets: SheetsClient; sheetId: string } | null> {
  if (!clientPromise) clientPromise = buildClient();
  return clientPromise;
}

export function isSheetsConfigured(): boolean {
  return !!SERVICE_ACCOUNT_JSON;
}

const HEADER = [
  "Taşınmaz No", "Ad Soyad / Unvan", "Bitiş Tarihi",
  "Mail Tarihi", "Durum", "Kalan Gün", "Son Güncelleme"
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRateLimit = e?.message?.includes("Quota") || e?.code === 429 || e?.message?.includes("429");
      if (isRateLimit && i < retries - 1) {
        const wait = delayMs * (i + 1);
        console.warn(`Google Sheets rate limit, retry ${i + 1}/${retries} — ${wait}ms`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

async function ensureHeader(sheets: SheetsClient, sheetId: string): Promise<void> {
  try {
    const res = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A1:G1",
    }));
    const firstRow = res.data.values?.[0];
    if (!firstRow || firstRow[0] !== "Taşınmaz No") {
      await withRetry(() => sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "A1:G1",
        valueInputOption: "RAW",
        requestBody: { values: [HEADER] },
      }));
    }
  } catch (e: any) {
    console.error("Google Sheets header hatası:", e.message);
  }
}

export async function syncYetkiToSheet(row: {
  tasinmazNo: string;
  ad: string;
  bitisTarihi: string | null;
  mailTarihi: string;
  durum: string;
  kalanGun: number | null;
}): Promise<boolean> {
  const client = await getClient();
  if (!client) return false;
  const { sheets, sheetId } = client;

  try {
    await ensureHeader(sheets, sheetId);

    const allRows = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A:A",
    }));
    const values = allRows.data.values ?? [];
    const rowIndex = values.findIndex((r, i) => i > 0 && r[0] === row.tasinmazNo);

    const newRow = [
      row.tasinmazNo,
      row.ad,
      row.bitisTarihi ?? "—",
      row.mailTarihi,
      row.durum,
      row.kalanGun !== null ? String(row.kalanGun) : "—",
      new Date().toLocaleString("tr-TR"),
    ];

    if (rowIndex > 0) {
      await withRetry(() => sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `A${rowIndex + 1}:G${rowIndex + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [newRow] },
      }));
    } else {
      await withRetry(() => sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "A:G",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [newRow] },
      }));
    }
    return true;
  } catch (e: any) {
    console.error("Google Sheets sync hatası:", e.message);
    return false;
  }
}

export async function fullSyncToSheet(rows: Array<{
  tasinmazNo: string;
  ad: string;
  bitisTarihi: string | null;
  mailTarihi: string;
  durum: string;
  kalanGun: number | null;
}>): Promise<boolean> {
  const client = await getClient();
  if (!client) return false;
  const { sheets, sheetId } = client;

  try {
    await withRetry(() => sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: "A:G",
    }));

    const allValues = [
      HEADER,
      ...rows.map((r) => [
        r.tasinmazNo,
        r.ad,
        r.bitisTarihi ?? "—",
        r.mailTarihi,
        r.durum,
        r.kalanGun !== null ? String(r.kalanGun) : "—",
        new Date().toLocaleString("tr-TR"),
      ]),
    ];

    await withRetry(() => sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: { values: allValues },
    }));

    console.log(`✅ Google Sheets: ${rows.length} satır senkronize edildi.`);
    return true;
  } catch (e: any) {
    console.error("Google Sheets full sync hatası:", e.message);
    return false;
  }
}

// ---- TWO-WAY: Read from Sheets → Import to DB ----
export async function readFromSheet(): Promise<Array<{
  tasinmazNo: string;
  ad: string;
  bitisTarihi: string | null;
  mailTarihi: string;
}>> {
  const client = await getClient();
  if (!client) return [];
  const { sheets, sheetId } = client;

  try {
    const res = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A:G",
    }));

    const rows = res.data.values ?? [];
    if (rows.length <= 1) return [];

    // Skip header row (index 0)
    return rows.slice(1).map((row) => ({
      tasinmazNo: String(row[0] ?? "").trim(),
      ad: String(row[1] ?? "").trim(),
      bitisTarihi: row[2] && row[2] !== "—" ? String(row[2]).trim() : null,
      mailTarihi: String(row[3] ?? new Date().toLocaleString("tr-TR")).trim(),
    })).filter((r) => r.tasinmazNo.length >= 5 && r.ad.length >= 2);
  } catch (e: any) {
    console.error("Google Sheets read error:", e.message);
    return [];
  }
}
