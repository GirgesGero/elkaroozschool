/**
 * EL KAROOZ SCHOOL — BIBLE ENCYCLOPEDIA v1.0
 * Google Apps Script Secure Google Drive Access Bridge
 * 
 * Target Folder: EL KAROOZ SCHOOL STORAGE / BIBLE / v1 (ID: 1hi5NoKnzdLW6UQ96SsRgYWerGle5iT_e)
 * Security: Token-gated REST Bridge for Hostinger PHP Backend
 */

var DEFAULT_ACCESS_TOKEN = "ELKARO...2026";
var BIBLE_V1_FOLDER_ID = "1hi5NoKnzdLW6UQ96SsRgYWerGle5iT_e";

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    
    if (e && e.postData && e.postData.contents) {
      try {
        var postJson = JSON.parse(e.postData.contents);
        for (var key in postJson) {
          if (!params[key]) params[key] = postJson[key];
        }
      } catch (err) {
        // Not JSON
      }
    }

    var expectedToken = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_ACCESS_TOKEN") || DEFAULT_ACCESS_TOKEN;
    var providedToken = params.token || (e && e.headers && (e.headers.Authorization || e.headers.authorization));
    
    if (providedToken && providedToken.indexOf("Bearer ") === 0) {
      providedToken = providedToken.substring(7).trim();
    }

    if (!providedToken || providedToken !== expectedToken) {
      return jsonResponse({
        ok: false,
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Access denied: Invalid or missing authentication token."
        }
      }, 401);
    }

    var action = params.action || "health";

    switch (action) {
      case "health":
        return jsonResponse({
          ok: true,
          data: {
            service: "EL KAROOZ Apps Script Bridge",
            status: "ONLINE",
            target_version: "v1",
            timestamp: new Date().toISOString()
          },
          error: null
        });

      case "upload":
        var filePath = params.path || "";
        var base64Data = params.base64 || "";
        var mimeType = params.mime || "application/octet-stream";
        if (!filePath || !base64Data) {
          return errorResponse("INVALID_PARAM", "Path and base64 data are required for upload.");
        }
        return saveFileByRelativePath(filePath, base64Data, mimeType);

      case "manifest":
        return getFileResponse("manifest.json");

      case "categories":
        return getFileResponse("categories.json");

      case "sections":
        return getFileResponse("sections.json");

      case "index":
        var indexName = params.name || "";
        if (!indexName) {
          return errorResponse("INVALID_PARAM", "Index name is required.");
        }
        return getFileResponse("indexes/" + indexName + ".json.gz", "indexes/" + indexName + ".json");

      case "sectionArticles":
        var secCode = params.section || "";
        if (!secCode) {
          return errorResponse("INVALID_PARAM", "Section code is required.");
        }
        return getFileResponse("indexes/sections/" + secCode + ".json.gz", "indexes/sections/" + secCode + ".json");

      case "titleIndex":
        return getFileResponse("search/title-index.json.gz", "search/title-index.json");

      case "searchShard":
        var shardId = parseInt(params.shard, 10);
        if (isNaN(shardId) || shardId < 0 || shardId > 63) {
          return errorResponse("INVALID_PARAM", "Valid shard ID (0-63) is required.");
        }
        var shardName = (shardId < 10 ? "0" + shardId : "" + shardId);
        return getFileResponse("search/shards/shard-" + shardName + ".json.gz", "search/shards/shard-" + shardName + ".json");

      case "article":
        var section = params.section || "";
        var chunk = params.chunk || "";
        if (!section || !chunk) {
          return errorResponse("INVALID_PARAM", "Both section and chunk parameters are required.");
        }
        return getFileResponse("articles/" + section + "/" + chunk + ".gz", "articles/" + section + "/" + chunk);

      case "file":
        var relPath = params.path || "";
        if (!relPath) {
          return errorResponse("INVALID_PARAM", "File path parameter is required.");
        }
        return getFileResponse(relPath);

      default:
        return errorResponse("UNKNOWN_ACTION", "Action '" + action + "' is not recognized.");
    }

  } catch (globalErr) {
    return jsonResponse({
      ok: false,
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: globalErr.toString()
      }
    }, 500);
  }
}

/**
 * Save a file inside BIBLE/v1
 */
function saveFileByRelativePath(relPath, base64Data, mimeType) {
  var cleanPath = relPath.replace(/\.\./g, "").replace(/\\/g, "/").replace(/^\/+/, "");
  var parts = cleanPath.split("/");
  var fileName = parts.pop();

  var currentFolder = DriveApp.getFolderById(BIBLE_V1_FOLDER_ID);
  if (!currentFolder) {
    return errorResponse("ROOT_NOT_FOUND", "BIBLE/v1 root folder not found.");
  }

  for (var i = 0; i < parts.length; i++) {
    var subfolderName = parts[i];
    var subfolders = currentFolder.getFoldersByName(subfolderName);
    if (subfolders.hasNext()) {
      currentFolder = subfolders.next();
    } else {
      currentFolder = currentFolder.createFolder(subfolderName);
    }
  }

  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);

  // Overwrite if existing
  var existingFiles = currentFolder.getFilesByName(fileName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  var createdFile = currentFolder.createFile(blob);

  return jsonResponse({
    ok: true,
    data: {
      file_id: createdFile.getId(),
      file_name: createdFile.getName(),
      size: createdFile.getSize(),
      path: cleanPath
    },
    error: null
  });
}

/**
 * Locate and read a file securely inside BIBLE/v1
 */
function getFileResponse(primaryPath, fallbackPath) {
  var file = findFileByRelativePath(primaryPath);
  var isGz = true;

  if (!file && fallbackPath) {
    file = findFileByRelativePath(fallbackPath);
    isGz = false;
  }

  if (!file) {
    return errorResponse("FILE_NOT_FOUND", "File not found: " + primaryPath);
  }

  var blob = file.getBlob();
  var bytes = blob.getBytes();
  var base64Data = Utilities.base64Encode(bytes);

  return jsonResponse({
    ok: true,
    data: {
      file_name: file.getName(),
      size: file.getSize(),
      is_gz: isGz,
      mime_type: blob.getContentType(),
      base64: base64Data
    },
    error: null
  });
}

/**
 * Traverse subfolders safely inside BIBLE/v1 to locate a file
 */
function findFileByRelativePath(relPath) {
  var cleanPath = relPath.replace(/\.\./g, "").replace(/\\/g, "/").replace(/^\/+/, "");
  var parts = cleanPath.split("/");
  var fileName = parts.pop();

  var currentFolder = DriveApp.getFolderById(BIBLE_V1_FOLDER_ID);
  if (!currentFolder) return null;

  for (var i = 0; i < parts.length; i++) {
    var subfolderName = parts[i];
    var subfolders = currentFolder.getFoldersByName(subfolderName);
    if (!subfolders.hasNext()) {
      return null;
    }
    currentFolder = subfolders.next();
  }

  var files = currentFolder.getFilesByName(fileName);
  if (files.hasNext()) {
    return files.next();
  }

  return null;
}

function jsonResponse(obj, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function errorResponse(code, message) {
  return jsonResponse({
    ok: false,
    data: null,
    error: {
      code: code,
      message: message
    }
  });
}
