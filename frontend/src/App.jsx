import React, { useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);


  // File upload handler
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setCurrentStep(3);
      toast.success(`קובץ ${file.name} נבחר בהצלחה`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml', '.drawio'],
    },
    maxFiles: 1,
    noClick: selectedMethod !== 'upload',
  });

  // Method selection
  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setCurrentStep(2);
    if (method === 'create') {
      toast.info('יצירת קובץ Draw.io - פתח את Draw.io בחלון חדש');
      window.open('https://app.diagrams.net/', '_blank');
    }
  };

  // Process file
  const processFile = async () => {
    if (!selectedFile) {
      toast.error('אנא בחר קובץ תחילה');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('drawioFile', selectedFile);

    try {
      const response = await axios.post(`${API_URL}/api/converter/convert`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      if (response.data.success) {
        setResult(response.data);
        setCurrentStep(4);
        toast.success('הקובץ עובד בהצלחה!');
      } else {
        throw new Error(response.data.error || 'שגיאה בעיבוד הקובץ');
      }
    } catch (error) {
      console.error('Process error:', error);
      toast.error(error.response?.data?.error || error.message || 'שגיאה בעיבוד הקובץ');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download XML
  const downloadXML = () => {
    if (!result || !result.xml) return;

    const blob = new Blob([result.xml], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || `commbox_bot_${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('הקובץ הורד בהצלחה!');
  };

  // NEW: Download intermediate mxGraphModel XML
  const downloadMxGraphModelXML = () => {
    if (!result || !result.mxGraphModelXml) return;
    const blob = new Blob([result.mxGraphModelXml], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.mxGraphModelFilename || `mxGraphModel_${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('קובץ mxGraphModel הורד בהצלחה!');
  };



  // Reset
  const resetProcess = () => {
    setCurrentStep(1);
    setSelectedMethod(null);
    setSelectedFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4 sm:p-8" dir="rtl">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            🤖 Commbox Bot Builder
          </h1>
          <p className="text-lg sm:text-xl text-white/90">
            המרת קבצי Draw.io לבוטים של Commbox באופן אוטומטי
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-10"
        >
          {/* Progress Steps */}
          <div className="flex justify-between mb-8 relative">
            <div className="absolute top-5 right-0 left-0 h-0.5 bg-gray-200"></div>
            <div 
              className="absolute top-5 right-0 h-0.5 bg-gradient-to-l from-purple-600 to-indigo-600 transition-all duration-500"
              style={{ width: `${(currentStep - 1) * 33.33}%` }}
            ></div>
            
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                    currentStep >= step 
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white scale-110' 
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > step ? '✓' : step}
                </div>
                <span className="text-xs mt-2 text-gray-600 hidden sm:block">
                  {step === 1 && 'בחירה'}
                  {step === 2 && 'העלאה'}
                  {step === 3 && 'עיבוד'}
                  {step === 4 && 'הורדה'}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Choose Method */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                  איך תרצה להתחיל?
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMethodSelect('upload')}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all group"
                  >
                    <div className="text-4xl mb-3">📁</div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-600">
                      העלה קובץ קיים
                    </h3>
                    <p className="text-gray-600 text-sm">
                      יש לך כבר קובץ Draw.io מוכן
                    </p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMethodSelect('create')}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all group"
                  >
                    <div className="text-4xl mb-3">✏️</div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-600">
                      צור קובץ חדש
                    </h3>
                    <p className="text-gray-600 text-sm">
                      פתח את Draw.io ליצירת פלואו חדש
                    </p>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Upload/Create */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                  {selectedMethod === 'upload' ? 'העלה את הקובץ' : 'צור קובץ ב-Draw.io'}
                </h2>

                {selectedMethod === 'upload' ? (
                  <div
                    {...getRootProps()}
                    className={`border-3 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                      isDragActive 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-300 hover:border-purple-400 bg-gray-50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="text-5xl sm:text-6xl mb-4">☁️</div>
                    {isDragActive ? (
                      <p className="text-lg text-purple-600">שחרר את הקובץ כאן...</p>
                    ) : (
                      <>
                        <p className="text-lg font-semibold mb-2">
                          גרור קובץ לכאן או לחץ לבחירה
                        </p>
                        <p className="text-sm text-gray-600">
                          קבצים נתמכים: .drawio, .xml
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-xl font-semibold mb-4 text-blue-900">
                      📝 הוראות ליצירת קובץ Draw.io
                    </h3>
                    <ol className="space-y-3 mr-6 text-gray-700">
                      <li>1. Draw.io נפתח בחלון חדש</li>
                      <li>2. צור את הפלואו של הבוט</li>
                      <li>3. השתמש בנודים: מעבר לנציג, לא ידוע, שגיאה, סיום</li>
                      <li>4. שמור: File → Export as → XML</li>
                      <li>5. חזור לכאן והעלה את הקובץ</li>
                    </ol>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMethodSelect('upload')}
                      className="mt-6 w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      סיימתי - העלה קובץ
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Process */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                  הקובץ מוכן לעיבוד
                </h2>
                
                {selectedFile && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 text-right">
                    <p className="font-semibold text-gray-700">📄 {selectedFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      גודל: {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={processFile}
                  disabled={isProcessing}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-bold text-lg hover:shadow-xl transform transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -mr-1 ml-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      מעבד את הקובץ...
                    </span>
                  ) : (
                    '🚀 התחל עיבוד'
                  )}
                </motion.button>

                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 space-y-2 text-gray-600"
                  >
                    <p>🔍 קורא את קובץ Draw.io...</p>
                    <p>🔧 מפענח את המבנה...</p>
                    <p>✨ יוצר קובץ XML של Commbox...</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 4: Download */}
            {currentStep === 4 && result && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
              <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                  הבוט שלך מוכן!
                </h2>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <p className="text-lg text-green-800 mb-4">
                    ✅ קובץ ה-XML נוצר בהצלחה
                  </p>
                  <div className="flex flex-col items-center gap-4">
                    {/* Main Download Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={downloadXML}
                      className="w-full px-8 py-3 bg-green-600 text-white rounded-full font-bold text-lg hover:bg-green-700 transition-all"
                    >
                      ⬇️ הורד קובץ Commbox XML
                    </motion.button>
                    {/* NEW: Temporary Download Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={downloadMxGraphModelXML}
                      className="w-full px-8 py-3 bg-gray-600 text-white rounded-full font-semibold hover:bg-gray-700 transition-all text-base"
                    >
                      🔧 הורד קובץ mxGraphModel (שלב ביניים)
                    </motion.button>
                  </div>
                </div>

                {result.xml && (
                  <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-auto text-right">
                    <pre className="text-xs text-green-400 font-mono">
                      {result.xml.substring(0, 500)}...
                    </pre>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetProcess}
                  className="mt-6 px-6 py-2 text-purple-600 hover:text-purple-700 font-semibold"
                >
                  🔄 התחל מחדש
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-white/70 text-sm"
        >
          <p>נבנה עם ❤️ עבור Commbox</p>
        </motion.div>
      </div>
    </div>
  );
}

export default App;
