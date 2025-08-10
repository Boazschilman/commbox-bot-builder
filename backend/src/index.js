
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const pako = require('pako');
const xml2js = require('xml2js');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept xml and drawio files
    if (file.mimetype === 'text/xml' || 
        file.mimetype === 'application/xml' ||
        file.originalname.endsWith('.drawio') ||
        file.originalname.endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי XML ו-Draw.io מותרים'));
    }
  }
});

// Helper function to decode Draw.io compressed content
function decodeDrawio(compressedContent) {
  try {
    // Remove whitespace
    const trimmed = compressedContent.trim();
    
    // Decode base64
    const decoded = Buffer.from(trimmed, 'base64');
    
    // Decompress using pako
    const decompressed = pako.inflateRaw(decoded, { to: 'string' });
    
    // URL decode
    const urlDecoded = decodeURIComponent(decompressed);
    
    return urlDecoded;
  } catch (error) {
    console.error('Decompression error:', error);
    throw new Error('Failed to decompress Draw.io file');
  }
}

// Helper function to parse Draw.io file
async function parseDrawioFile(fileContent) {
  const parser = new xml2js.Parser();
  try {
    // Parse the outer XML
    const result = await parser.parseStringPromise(fileContent);
    // Find the diagram content - check different possible structures
    let diagramContent = null;
    if (result.mxfile && result.mxfile.diagram) {
      diagramContent = result.mxfile.diagram[0];
    } else if (result.diagram) {
      diagramContent = result.diagram;
    }
    
    if (!diagramContent) {
      throw new Error('Invalid Draw.io file format - no diagram found');
    }
    
    // Get the compressed content
    let compressedData = null;
    if (typeof diagramContent === 'string') {
      compressedData = diagramContent;
    } else if (diagramContent._) {
      compressedData = diagramContent._;
    } else if (diagramContent.$text) {
      compressedData = diagramContent.$text;
    }
    
    if (!compressedData) {
      throw new Error('No compressed data found in diagram');
    }
    
    // Decode the compressed content
    const decodedContent = decodeDrawio(compressedData);
    // Parse the decoded mxGraphModel
    const graphModel = await parser.parseStringPromise(decodedContent);
    // Extract nodes and connections
    const nodes = extractNodes(graphModel);
    const connections = extractConnections(graphModel);
    // Return the decoded XML string as well
    return { nodes, connections, mxGraphModelXml: decodedContent };
  } catch (error) {
    console.error('Parse error:', error);
    throw error;
  }
}

// Extract nodes from graph model
function extractNodes(graphModel) {
  const nodes = [];
  
  try {
    const cells = graphModel.mxGraphModel?.root?.[0]?.mxCell || [];
    
    cells.forEach(cell => {
      const attrs = cell.$ || {};
      if (attrs.vertex === '1' || attrs.value) {
        nodes.push({
          id: attrs.id,
          value: attrs.value || '',
          style: attrs.style || '',
          parent: attrs.parent,
          geometry: cell.mxGeometry?.[0]?.$ || {}
        });
      }
    });
  } catch (error) {
    console.error('Error extracting nodes:', error);
  }
  
  return nodes;
}

// Extract connections from graph model
function extractConnections(graphModel) {
  const connections = [];
  
  try {
    const cells = graphModel.mxGraphModel?.root?.[0]?.mxCell || [];
    
    cells.forEach(cell => {
      const attrs = cell.$ || {};
      if (attrs.edge === '1') {
        connections.push({
          id: attrs.id,
          source: attrs.source,
          target: attrs.target,
          value: attrs.value || ''
        });
      }
    });
  } catch (error) {
    console.error('Error extracting connections:', error);
  }
  
  return connections;
}

// Detect node type based on value and style
function detectNodeType(node) {
  const value = (node.value || '').toLowerCase();
  const style = (node.style || '').toLowerCase();
  
  // Check for special node types based on Hebrew or English keywords
  if (value.includes('מעבר לנציג') || value.includes('transfer') || value.includes('agent')) {
    return 'transfer';
  }
  if (value.includes('לא ידוע') || value.includes('unknown')) {
    return 'unknown';
  }
  if (value.includes('שגיאה') || value.includes('error')) {
    return 'error';
  }
  if (value.includes('סיום') || value.includes('סגירה') || value.includes('end') || value.includes('close')) {
    return 'end';
  }
  if (value.includes('התחלה') || value.includes('start')) {
    return 'start';
  }
  if (value.includes('קלט') || value.includes('input')) {
    return 'input';
  }
  
  // Check style for shape hints
  if (style.includes('ellipse') || style.includes('circle')) {
    return 'start';
  }
  if (style.includes('rhombus') || style.includes('diamond')) {
    return 'decision';
  }
  
  return 'message';
}

// Build hierarchy from nodes and connections
function buildHierarchy(nodes, connections) {
  const nodeMap = new Map();
  const hierarchy = [];
  
  // Create a map of nodes
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      ...node,
      children: []
    });
  });
  
  // Build parent-child relationships
  connections.forEach(conn => {
    const sourceNode = nodeMap.get(conn.source);
    const targetNode = nodeMap.get(conn.target);
    
    if (sourceNode && targetNode) {
      sourceNode.children.push(targetNode.id);
      targetNode.parent = sourceNode.id;
    }
  });
  
  // Find root nodes (nodes without parents from connections)
  nodes.forEach(node => {
    const hierarchyNode = nodeMap.get(node.id);
    if (!hierarchyNode.parent || hierarchyNode.parent === '1' || hierarchyNode.parent === '0') {
      hierarchy.push(hierarchyNode);
    }
  });
  
  return { nodeMap, hierarchy };
}

// Convert to Commbox node format
function convertToCommboxNode(node, index, parentId = '#') {
  const nodeType = detectNodeType(node);
  const nodeId = `n_${index}`;
  
  const commboxNode = {
    id: nodeId,
    text: node.value || `Node ${index}`,
    parent: parentId,
    rI: "2",
    addChannelStateMessage: false,
    attachments: {}
  };
  
  // Add type-specific properties
  switch(nodeType) {
    case 'message':
      if (node.value && node.value.length > 20) {
        commboxNode.bodyHtml = node.value;
      }
      break;
    case 'transfer':
      commboxNode.step = 'agent_node';
      break;
    case 'unknown':
      commboxNode.unknown = "1";
      break;
    case 'error':
      commboxNode.error = true;
      break;
    case 'end':
      commboxNode.end = "2";
      break;
    case 'input':
      commboxNode.d_e = [{
        uniqueName: `input_${index}`,
        name: node.value || 'הזן קלט',
        labelDescription: "",
        type: "string",
        key: false,
        isVisible: false,
        isMandatory: true,
        askOnlyOnce: false,
        isSystemField: false,
        fieldType: "1",
        validation: ""
      }];
      break;
  }
  
  return commboxNode;
}

// Generate Commbox XML from parsed data
function generateCommboxXML(parsedData) {
  const { nodes, connections } = parsedData;
  const { nodeMap, hierarchy } = buildHierarchy(nodes, connections);
  
  // Initialize script array with configuration
  const scriptArray = [
    {
      seedId: 44,
      endNodeId: "",
      genericDelayJumpTime: "",
      genericDelayJumpNode: "",
      genericRedisplayTime: "",
      genericRedisplayMessage: "",
      dataContextExpirationTime: "",
      engineVersion: 0,
      allowUsingAI: false,
      importMismatches: [],
      assistantId: ""
    }
  ];
  
  // Add root node
  scriptArray.push({
    id: "node_0",
    text: "התחלה",
    parent: "#",
    rI: "2",
    addChannelStateMessage: false,
    attachments: {}
  });
  
  // Process nodes in order
  let nodeIndex = 2;
  const processedNodes = new Set();
  
  function processNode(node, parentId = "node_0") {
    if (processedNodes.has(node.id)) return;
    processedNodes.add(node.id);
    
    const commboxNode = convertToCommboxNode(node, nodeIndex++, parentId);
    scriptArray.push(commboxNode);
    
    // Process children
    if (node.children && node.children.length > 0) {
      node.children.forEach(childId => {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          processNode(childNode, commboxNode.id);
        }
      });
    }
  }
  
  // Process all hierarchy roots
  hierarchy.forEach(rootNode => {
    processNode(rootNode);
  });
  
  // Add fixed process nodes (מעבר לנציג, שגיאה, לא ידוע)
  scriptArray.push({
    id: "n_3",
    text: "תהליכים קבועים",
    parent: "node_0",
    buttonDisplayMode: "1",
    rI: "2",
    addChannelStateMessage: false,
    attachments: {}
  });
  
  scriptArray.push({
    id: "n_10",
    text: "מעבר לנציג",
    parent: "n_3",
    rI: "2",
    addChannelStateMessage: false,
    attachments: {}
  });
  
  scriptArray.push({
    id: "n_11",
    text: "Error",
    parent: "n_3",
    rI: "2",
    addChannelStateMessage: false,
    error: true
  });
  
  scriptArray.push({
    id: "n_12",
    text: "לא ידוע",
    parent: "n_3",
    rI: "2",
    addChannelStateMessage: false,
    unknown: "1"
  });
  
  // Convert to JSON string and escape for XML
  const scriptValue = JSON.stringify(scriptArray);
  const escapedValue = scriptValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  // Generate final XML
  const timestamp = new Date().toLocaleString('he-IL');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Section Name="Scripts">
    <SCRIPT Value="${escapedValue}" 
            EncryptedStreamId="generated_${Date.now()}" 
            Name="Bot Generated ${timestamp}" 
            Brand="802" />
</Section>`;
  
  return xml;
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Commbox Bot Builder API'
  });
});

// Main conversion endpoint
app.post('/api/converter/convert', upload.single('drawioFile'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'לא הועלה קובץ' 
      });
    }
    
    console.log('Processing file:', req.file.originalname);
    // Get file content
    const fileContent = req.file.buffer.toString('utf-8');
    // Parse Draw.io file
    const parsedData = await parseDrawioFile(fileContent);
    
    console.log(`Parsed ${parsedData.nodes.length} nodes and ${parsedData.connections.length} connections`);
    // Generate Commbox XML
    const xml = generateCommboxXML(parsedData);
    // Send response with both final and intermediate files
    res.json({
      success: true,
      xml: xml,
      mxGraphModelXml: parsedData.mxGraphModelXml,
      filename: `commbox_bot_${Date.now()}.xml`,
      mxGraphModelFilename: `mxGraphModel_${Date.now()}.xml`,
      stats: {
        nodesCount: parsedData.nodes.length,
        connectionsCount: parsedData.connections.length
      }
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בעיבוד הקובץ'
    });
  }
});

// Test endpoint for development
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    endpoints: {
      health: 'GET /health',
      convert: 'POST /api/converter/convert'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'הקובץ גדול מדי. הגודל המקסימלי הוא 10MB' 
      });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: error.message || 'שגיאת שרת' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
    🚀 Commbox Bot Builder API
    📍 Running on port ${PORT}
    🌍 Environment: ${process.env.NODE_ENV || 'development'}
    🔗 Health check: http://localhost:${PORT}/health
  `);
});
