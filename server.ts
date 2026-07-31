import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for image/PDF uploads
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// In-memory submissions database with initial sample data for 2026 현동숲유치원
let submissions = [
  {
    id: "sub-101",
    submittedAt: "2026-07-28 09:15",
    userName: "김숲아",
    position: "원장",
    category: "교원",
    certificateNo: "2026-HD-0012",
    hours: 15,
    completionDate: "2026-07-25",
    issuer: "경상남도교육청연수원",
    courseName: "2026 유치원 원장 리더십 및 유아숲교육 역량 강화 연수",
    isCompleted: true,
    isSubmitted: true,
    fileName: "원장_이수증_2026.pdf"
  },
  {
    id: "sub-102",
    submittedAt: "2026-07-29 11:30",
    userName: "이은별",
    position: "원감",
    category: "교원",
    certificateNo: "2026-HD-0045",
    hours: 12,
    completionDate: "2026-07-27",
    issuer: "중앙교원연수원",
    courseName: "유치원 안전관리 및 긴급구조 실습 과정",
    isCompleted: true,
    isSubmitted: true,
    fileName: "이은별_안전교육_이수증.png"
  },
  {
    id: "sub-103",
    submittedAt: "2026-07-30 14:20",
    userName: "박민준",
    position: "교사",
    category: "교원",
    certificateNo: "2026-GNG-881",
    hours: 8,
    completionDate: "2026-07-29",
    issuer: "한국교원대학교 연수원",
    courseName: "2026 숲체험 중심 누리과정 심화 직무연수",
    isCompleted: true,
    isSubmitted: true,
    fileName: "박민준_숲체험연수.pdf"
  },
  {
    id: "sub-104",
    submittedAt: "2026-07-30 16:45",
    userName: "정다운",
    position: "행정실장",
    category: "행정직",
    certificateNo: "2026-ADM-3021",
    hours: 10,
    completionDate: "2026-07-28",
    issuer: "경상남도교육청 중앙연수원",
    courseName: "2026 교육행정 실무 및 유치원 회계 법령 이해",
    isCompleted: true,
    isSubmitted: true,
    fileName: "정다운_행정실무.jpg"
  },
  {
    id: "sub-105",
    submittedAt: "2026-07-31 10:10",
    userName: "최지수",
    position: "조리사",
    category: "공무직",
    certificateNo: "2026-FOOD-0099",
    hours: 6,
    completionDate: "2026-07-30",
    issuer: "창원시 위생교육원",
    courseName: "유치원 집단급식소 위생 및 영양 관리 실무",
    isCompleted: true,
    isSubmitted: true,
    fileName: "최지수_위생교육이수증.pdf"
  }
];

// Active GAS Deployment URL
let gasUrl = process.env.GAS_URL || "";

// Target staff count for completion rate calculation (default: 20)
let targetStaffCount = 20;

// API Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Admin PIN Verification
app.post("/api/admin/verify-pin", (req, res) => {
  const { pin } = req.body;
  const adminPin = process.env.ADMIN_PIN || "1234";

  if (pin === adminPin) {
    return res.json({ success: true, message: "관리자 인증에 성공하였습니다." });
  } else {
    return res.status(401).json({ success: false, message: "인증번호가 일치하지 않습니다." });
  }
});

// Gemini AI OCR Route
app.post("/api/gemini", async (req, res) => {
  try {
    const { fileData, mimeType, fileName } = req.body;

    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "파일 데이터와 MIME 타입이 필요합니다." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY가 설정되지 않았습니다. Settings > Secrets에 API 키를 등록해주세요."
      });
    }

    // Initialize @google/genai SDK on server side
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    // Strip header prefix if present (e.g. data:image/png;base64,)
    const cleanBase64 = fileData.replace(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-.+]+);base64,/, "");

    const promptText = `이 문서는 교직원 연수 이수증(PDF 또는 이미지)입니다.
문서에서 다음 5개 항목을 정확히 분석하여 JSON 포맷으로 추출하세요:
1. certificateNo: 이수번호 또는 발급번호 (없으면 "")
2. hours: 이수시간 (숫자만, 예: 15.0 또는 15, 없으면 0)
3. completionDate: 이수완료일자 또는 연수기간 종료일 (YYYY-MM-DD 형식)
4. issuer: 발급기관 또는 인증기관명 (예: 경상남도교육청연수원, 중앙교원연수원 등)
5. courseName: 연수과정명 또는 교육명 (예: 2026 유치원 교원 안전교육 과정)

단 한 항목도 빠뜨리지 말고 추출된 데이터 기반으로 완벽한 JSON을 구성하세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            }
          },
          {
            text: promptText,
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            certificateNo: { type: Type.STRING, description: "이수번호" },
            hours: { type: Type.NUMBER, description: "이수시간 (숫자)" },
            completionDate: { type: Type.STRING, description: "이수완료일자 (YYYY-MM-DD)" },
            issuer: { type: Type.STRING, description: "인증기관명" },
            courseName: { type: Type.STRING, description: "연수과정명" },
          },
          required: ["certificateNo", "hours", "completionDate", "issuer", "courseName"],
        }
      }
    });

    const responseText = response.text || "{}";
    let extractedData;
    try {
      extractedData = JSON.parse(responseText);
    } catch {
      extractedData = {
        certificateNo: "",
        hours: 0,
        completionDate: new Date().toISOString().split("T")[0],
        issuer: "",
        courseName: ""
      };
    }

    // Ensure types & defaults
    const result = {
      certificateNo: String(extractedData.certificateNo || ""),
      hours: typeof extractedData.hours === "number" ? extractedData.hours : parseFloat(extractedData.hours) || 0,
      completionDate: String(extractedData.completionDate || new Date().toISOString().split("T")[0]),
      issuer: String(extractedData.issuer || ""),
      courseName: String(extractedData.courseName || "")
    };

    return res.json({
      success: true,
      data: result,
      fileName
    });

  } catch (err: any) {
    console.error("Gemini Extraction Error:", err);
    return res.status(500).json({
      error: "이수증 분석 중 오류가 발생했습니다: " + (err.message || "알 수 없는 오류")
    });
  }
});

// Submissions GET
app.get("/api/submissions", async (req, res) => {
  try {
    // If GAS URL is set, try fetching remote sync data
    if (gasUrl) {
      try {
        const gasRes = await fetch(gasUrl + "?action=get", { method: "GET" });
        if (gasRes.ok) {
          const remoteData = await gasRes.json();
          if (Array.isArray(remoteData) && remoteData.length > 0) {
            submissions = remoteData;
          }
        }
      } catch (gasErr) {
        console.warn("GAS fetch fallback to local memory:", gasErr);
      }
    }
    return res.json({
      success: true,
      submissions,
      gasUrl,
      targetStaffCount
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Submissions POST (Create submission)
app.post("/api/submissions", async (req, res) => {
  try {
    const newSubmission = {
      id: "sub-" + Date.now(),
      submittedAt: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace("T", " ").substring(0, 16),
      userName: req.body.userName || "미상",
      position: req.body.position || "교사",
      category: req.body.category || "교원",
      certificateNo: req.body.certificateNo || "",
      hours: Number(req.body.hours) || 0,
      completionDate: req.body.completionDate || new Date().toISOString().split("T")[0],
      issuer: req.body.issuer || "",
      courseName: req.body.courseName || "",
      isCompleted: true,
      isSubmitted: true,
      fileName: req.body.fileName || "첨부파일"
    };

    submissions.unshift(newSubmission);

    // Sync with Google Apps Script if URL is provided
    let syncedToGas = false;
    if (gasUrl) {
      try {
        const gasRes = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSubmission)
        });
        if (gasRes.ok) {
          syncedToGas = true;
        }
      } catch (gasErr) {
        console.warn("GAS Post Warning (Saved locally):", gasErr);
      }
    }

    return res.json({
      success: true,
      submission: newSubmission,
      syncedToGas,
      message: syncedToGas
        ? "이수증이 성공적으로 제출되었으며 구글 시트에 동기화되었습니다."
        : "이수증이 성공적으로 제출되었습니다. (서버 저장 완료)"
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Submissions DELETE
app.delete("/api/submissions/:id", (req, res) => {
  const { id } = req.params;
  const initialLen = submissions.length;
  submissions = submissions.filter(s => s.id !== id);

  if (submissions.length < initialLen) {
    return res.json({ success: true, message: "제출 내역이 삭제되었습니다." });
  } else {
    return res.status(404).json({ success: false, message: "해당 내역을 찾을 수 없습니다." });
  }
});

// Config GET & POST for GAS URL and Target Staff Count
app.get("/api/config", (_req, res) => {
  res.json({ gasUrl, targetStaffCount });
});

app.post("/api/config", (req, res) => {
  if (req.body.gasUrl !== undefined) gasUrl = req.body.gasUrl;
  if (req.body.targetStaffCount !== undefined) targetStaffCount = Number(req.body.targetStaffCount) || 20;
  res.json({ success: true, gasUrl, targetStaffCount });
});

// Start Express + Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌲 2026 현동숲유치원 연수관리 서버 실행 중: http://localhost:${PORT}`);
  });
}

startServer();
