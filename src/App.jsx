import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const BRANCHES = [
  "Biological Science & Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Computer Science & Engineering",
  "Electrical Engineering",
  "Electronics & Communication Engineering",
  "Materials & Metallurgical Engineering",
  "Mechanical Engineering",
  "Architecture",
  "Planning",
];

const BRANCH_YEARS = {
  "Architecture": ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"],
  "Planning": ["1st Year", "2nd Year", "3rd Year", "4th Year"],
};
const DEFAULT_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const BRANCH_ICONS = {
  "Biological Science & Engineering": "🧬",
  "Civil Engineering": "🏗️",
  "Chemical Engineering": "⚗️",
  "Computer Science & Engineering": "💻",
  "Electrical Engineering": "⚡",
  "Electronics & Communication Engineering": "📡",
  "Materials & Metallurgical Engineering": "🔩",
  "Mechanical Engineering": "⚙️",
  "Architecture": "🏛️",
  "Planning": "🗺️",
};

const BRANCH_SHORT = {
  "Biological Science & Engineering": "BSE",
  "Civil Engineering": "Civil",
  "Chemical Engineering": "Chem",
  "Computer Science & Engineering": "CSE",
  "Electrical Engineering": "EE",
  "Electronics & Communication Engineering": "ECE",
  "Materials & Metallurgical Engineering": "MME",
  "Mechanical Engineering": "Mech",
  "Architecture": "Arch",
  "Planning": "Plan",
};

const TYPE_COLORS = {
  books: "bg-blue-100 text-blue-700",
  notes: "bg-green-100 text-green-700",
  pyqs: "bg-orange-100 text-orange-700",
  videos: "bg-purple-100 text-purple-700",
};
const TYPE_LABELS = { books: "📘 Book", notes: "📝 Note", pyqs: "📄 PYQ", videos: "🎥 Video" };

const YEAR_COLORS = [
  "from-blue-500 to-blue-700",
  "from-purple-500 to-purple-700",
  "from-green-500 to-green-700",
  "from-orange-500 to-orange-700",
  "from-rose-500 to-rose-700",
];

const buildInitialData = () => {
  const d = {};
  BRANCHES.forEach(br => {
    d[br] = {};
    const years = BRANCH_YEARS[br] || DEFAULT_YEARS;
    years.forEach((yr, i) => {
      const s1 = `Sem ${i * 2 + 1}`;
      const s2 = `Sem ${i * 2 + 2}`;
      d[br][yr] = { [s1]: {}, [s2]: {} };
    });
  });
  return d;
};

export default function App() {
  const [data, setData] = useState(buildInitialData);
  const [dbReady, setDbReady] = useState(false);
  const [nav, setNav] = useState({ branch: null, year: null, sem: null, subject: null });
  const [activeTab, setActiveTab] = useState("books");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);

  const emptyForm = { branch: "", year: "", sem: "", subject: "", title: "", type: "books", link: "" };
  const [form, setForm] = useState(emptyForm);
  const [subForm, setSubForm] = useState({ branch: "", year: "", sem: "", subject: "" });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: row } = await supabase.from("resources").select("data").single();
      if (row?.data && Object.keys(row.data).length > 0) {
        setData(row.data);
      }
      setDbReady(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    const save = async () => {
      const { error } = await supabase.from("resources").update({ data }).eq("id", 1);
      if (error) console.error("Save error:", error);
    };
    save();
  }, [data, dbReady]);

  const go = (key, val) => {
    if (key === "branch") setNav({ branch: val, year: null, sem: null, subject: null });
    else if (key === "year") setNav(n => ({ ...n, year: val, sem: null, subject: null }));
    else if (key === "sem") setNav(n => ({ ...n, sem: val, subject: null }));
    else if (key === "subject") { setNav(n => ({ ...n, subject: val })); setActiveTab("books"); }
  };

  const getYears = (br) => BRANCH_YEARS[br] || DEFAULT_YEARS;

  const handleSearch = (q) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const res = [];
    Object.entries(data).forEach(([br, years]) =>
      Object.entries(years).forEach(([yr, sems]) =>
        Object.entries(sems).forEach(([sm, subjs]) =>
          Object.entries(subjs).forEach(([sub, types]) =>
            Object.entries(types).forEach(([type, items]) => {
              if (Array.isArray(items)) {
                items.forEach(item => {
                  if (item.title.toLowerCase().includes(q.toLowerCase()) || sub.toLowerCase().includes(q.toLowerCase()))
                    res.push({ br, yr, sm, sub, type, ...item });
                });
              }
            })
          )
        )
      )
    );
    setSearchResults(res);
  };

  const handleUpload = async () => {
    const { branch, year, sem, subject, title, type, link } = form;

    if (!branch || !year || !sem || !subject || !title)
      return alert("Please select all categories and provide a title!");

    if (!uploadFile && !link.trim())
      return alert("Please choose a file to upload or provide a web link!");

    let finalLink = link.trim() || "#";
    let isFile = false;

    if (uploadFile) {
      setUploading(true);
      const fileExt = uploadFile.name.split(".").pop();
      const safeBranch = branch.replace(/\s+/g, "_");
      const safeSubject = subject.replace(/\s+/g, "_");
      const fileName = `${safeBranch}/${year}/${sem}/${safeSubject}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("resources")
        .upload(fileName, uploadFile, { upsert: false });

      setUploading(false);

      if (error) {
        alert("File system storage failed: " + error.message);
        return;
      }

      const { data: urlData } = supabase.storage.from("resources").getPublicUrl(fileName);
      finalLink = urlData.publicUrl;
      isFile = true;
    }

    const newItem = {
      title,
      link: finalLink,
      uploadedBy: "Student",
      date: new Date().toLocaleDateString(),
      isFile,
      fileName: uploadFile ? uploadFile.name : null,
    };

    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (!updated[branch]?.[year]?.[sem]?.[subject]) {
        if (!updated[branch]) updated[branch] = {};
        if (!updated[branch][year]) updated[branch][year] = {};
        if (!updated[branch][year][sem]) updated[branch][year][sem] = {};
        updated[branch][year][sem][subject] = { books: [], notes: [], pyqs: [], videos: [] };
      }
      updated[branch][year][sem][subject][type].push(newItem);
      return updated;
    });

    setForm(emptyForm);
    setUploadFile(null);
    setShowUpload(false);
  };

  const handleAddSubject = () => {
    const { branch, year, sem, subject } = subForm;
    if (!branch || !year || !sem || !subject.trim()) return alert("Please fill all fields!");
    setData(prev => {
      const u = JSON.parse(JSON.stringify(prev));
      if (!u[branch]?.[year]?.[sem]) return prev;
      if (u[branch][year][sem][subject]) { alert("Subject already exists!"); return prev; }
      u[branch][year][sem][subject] = { books: [], notes: [], pyqs: [], videos: [] };
      return u;
    });
    setSubForm({ branch: "", year: "", sem: "", subject: "" });
    setShowAddSubject(false);
  };

  const handleRenameSubject = (oldSubName) => {
    const newSubName = prompt(`Rename "${oldSubName}" to:`, oldSubName);
    if (!newSubName || !newSubName.trim()) return;
    if (newSubName.trim() === oldSubName) return;

    const { branch, year, sem } = nav;

    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const targetSem = updated[branch]?.[year]?.[sem];

      if (!targetSem || !targetSem[oldSubName]) return prev;
      if (targetSem[newSubName]) {
        alert("A subject with that name already exists!");
        return prev;
      }

      targetSem[newSubName] = targetSem[oldSubName];
      delete targetSem[oldSubName];
      return updated;
    });

    setNav(n => ({ ...n, subject: null }));
  };

  const handleDeleteSubject = (subName) => {
    if (!confirm(`Are you sure you want to delete "${subName}" and all its uploaded resources?`)) return;

    const { branch, year, sem } = nav;

    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated[branch]?.[year]?.[sem]?.[subName]) {
        delete updated[branch][year][sem][subName];
      }
      return updated;
    });

    setNav(n => ({ ...n, subject: null }));
  };

  const totalCount = () => {
    let c = 0;
    Object.values(data).forEach(yrs => Object.values(yrs).forEach(sems => Object.values(sems).forEach(subjs => Object.values(subjs).forEach(types => {
      if (Array.isArray(types)) c += types.length;
      else Object.values(types).forEach(items => { if (Array.isArray(items)) c += items.length; });
    }))));
    return c;
  };

  const resources = nav.branch && nav.year && nav.sem && nav.subject
    ? data[nav.branch]?.[nav.year]?.[nav.sem]?.[nav.subject] : null;

  const formYears = form.branch ? getYears(form.branch) : [];
  const formSems = form.branch && form.year ? Object.keys(data[form.branch]?.[form.year] || {}) : [];
  const formSubjects = form.branch && form.year && form.sem ? Object.keys(data[form.branch]?.[form.year]?.[form.sem] || {}) : [];
  const subYears = subForm.branch ? getYears(subForm.branch) : [];
  const subSems = subForm.branch && subForm.year ? Object.keys(data[subForm.branch]?.[subForm.year] || {}) : [];

  const curYears = nav.branch ? getYears(nav.branch) : [];
  const curSems = nav.branch && nav.year ? Object.keys(data[nav.branch]?.[nav.year] || {}) : [];
  const curSubjects = nav.branch && nav.year && nav.sem ? Object.keys(data[nav.branch]?.[nav.year]?.[nav.sem] || {}) : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header Container */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white px-4 py-6 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="cursor-pointer" onClick={() => { setNav({ branch: null, year: null, sem: null, subject: null }); setSearch(""); setSearchResults([]); }}>
            <h1 className="text-2xl font-bold tracking-tight">📚 Student Resource Hub</h1>
            <p className="text-indigo-200 text-xs mt-0.5">{totalCount()} resources · {BRANCHES.length} branches</p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              placeholder="Search resources..." 
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border-0 text-gray-900 outline-none w-48 md:w-64 focus:ring-2 focus:ring-yellow-400"
            />
            <button onClick={() => setShowAddSubject(true)} className="bg-white text-indigo-700 font-semibold px-3 py-2 rounded-lg text-sm hover:bg-indigo-50 transition">+ Subject</button>
            <button onClick={() => setShowUpload(true)} className="bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded-lg text-sm hover:bg-yellow-300 transition">⬆ Upload</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Breadcrumbs Navigation */}
        {(nav.branch || nav.year || nav.sem || nav.subject) && !search && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-4 flex-wrap bg-white px-4 py-2 rounded-xl shadow-sm">
            <span className="cursor-pointer text-indigo-600 hover:underline font-medium" onClick={() => setNav({ branch: null, year: null, sem: null, subject: null })}>🏠 Home</span>
            {nav.branch && <><span className="text-gray-300">›</span><span className="cursor-pointer text-indigo-600 hover:underline" onClick={() => go("branch", nav.branch)}>{BRANCH_SHORT[nav.branch]}</span></>}
            {nav.year && <><span className="text-gray-300">›</span><span className="cursor-pointer text-indigo-600 hover:underline" onClick={() => go("year", nav.year)}>{nav.year}</span></>}
            {nav.sem && <><span className="text-gray-300">›</span><span className="cursor-pointer text-indigo-600 hover:underline" onClick={() => go("sem", nav.sem)}>{nav.sem}</span></>}
            {nav.subject && <><span className="text-gray-300">›</span><span className="text-gray-700 font-semibold">{nav.subject}</span></>}
          </div>
        )}

        {/* Global Search Interface */}
        {search && (
          <div>
            <h2 className="font-bold text-lg mb-3 text-gray-700">Search Results <span className="text-indigo-500">({searchResults.length})</span></h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><div className="text-5xl mb-2">🔍</div><p>No results found for "{search}"</p></div>
            ) : (
              <div className="grid gap-3">
                {searchResults.map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.br} · {item.yr} · {item.sm} · <span className="text-gray-600 font-medium">{item.sub}</span></p>
                      {item.isFile && item.fileName && <p className="text-xs text-indigo-500 mt-0.5">📎 {item.fileName}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[item.type]}`}>{TYPE_LABELS[item.type]}</span>
                      <a href={item.link} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-indigo-700">
                        {item.isFile ? "📎 Open File" : "🔗 View / Download"}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Level 1: Branch Cards Selector */}
        {!search && !nav.branch && (
          <div>
            <h2 className="font-bold text-xl mb-4 text-gray-700">Select Branch</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {BRANCHES.map(br => (
                <div key={br} onClick={() => go("branch", br)}
                  className="bg-white rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:border-indigo-300 transition shadow-md border-2 border-transparent text-center group">
                  <div className="text-4xl mb-2">{BRANCH_ICONS[br]}</div>
                  <div className="font-bold text-gray-800 text-sm leading-tight group-hover:text-indigo-600 transition">{br}</div>
                  <div className="text-xs text-gray-400 mt-1">{getYears(br).length} Years</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level 2: Year Selector */}
        {!search && nav.branch && !nav.year && (
          <div>
            <h2 className="font-bold text-xl mb-1 text-gray-700">{BRANCH_ICONS[nav.branch]} {nav.branch}</h2>
            <p className="text-sm text-gray-400 mb-4">Select Year</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {curYears.map((yr, i) => {
                const yearData = data[nav.branch]?.[yr] || {};
                const subjectCount = Object.values(yearData).reduce((acc, semData) => acc + Object.keys(semData).length, 0);
                return (
                  <div key={yr} onClick={() => go("year", yr)}
                    className={`bg-gradient-to-br ${YEAR_COLORS[i % YEAR_COLORS.length]} text-white rounded-2xl p-5 cursor-pointer hover:scale-105 transition-transform shadow-lg text-center`}>
                    <div className="text-3xl mb-1">🎓</div>
                    <div className="font-bold">{yr}</div>
                    <div className="text-xs opacity-80 mt-1">{subjectCount} subjects</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Level 3: Semester Selector */}
        {!search && nav.branch && nav.year && !nav.sem && (
          <div>
            <h2 className="font-bold text-xl mb-1 text-gray-700">{nav.year} — {BRANCH_SHORT[nav.branch]}</h2>
            <p className="text-sm text-gray-400 mb-4">Select Semester</p>
            <div className="grid grid-cols-2 gap-4">
              {curSems.map(sm => {
                const cnt = Object.keys(data[nav.branch]?.[nav.year]?.[sm] || {}).length;
                return (
                  <div key={sm} onClick={() => go("sem", sm)}
                    className="bg-white rounded-2xl p-6 cursor-pointer hover:shadow-xl transition shadow-md border border-gray-100 text-center">
                    <div className="text-4xl mb-2">📅</div>
                    <div className="font-bold text-gray-800 text-lg">{sm}</div>
                    <div className="text-xs text-gray-400 mt-1">{cnt} subject{cnt !== 1 ? "s" : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Level 4: Subject Selector with Actions */}
        {!search && nav.branch && nav.year && nav.sem && !nav.subject && (
          <div>
            <h2 className="font-bold text-xl mb-1 text-gray-700">{nav.sem} — {BRANCH_SHORT[nav.branch]}</h2>
            <p className="text-sm text-gray-400 mb-4">Select or Manage Subjects</p>
            {curSubjects.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">📭</div>
                <p>No subjects added yet.</p>
                <button onClick={() => setShowAddSubject(true)} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">+ Add Subject</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {curSubjects.map(sub => {
                  const r = data[nav.branch][nav.year][nav.sem][sub] || { books: [], notes: [], pyqs: [], videos: [] };
                  const total = (r.books?.length || 0) + (r.notes?.length || 0) + (r.pyqs?.length || 0) + (r.videos?.length || 0);
                  return (
                    <div key={sub} 
                      className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center justify-between gap-4 hover:shadow-xl transition group">
                      
                      {/* Clickable Area to enter Subject Dashboard */}
                      <div onClick={() => go("subject", sub)} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
                        <div className="text-4xl">📖</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 truncate group-hover:text-indigo-600 transition">{sub}</div>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {["books", "notes", "pyqs", "videos"].map(t => (
                              <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[t]}`}>{(r[t] || []).length} {t}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Management Action Handlers */}
                      <div className="flex items-center gap-3">
                        <div className="text-xl font-bold text-indigo-500 mr-1">{total}</div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRenameSubject(sub); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Rename Subject"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Subject"
                        >
                          🗑️
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Level 5: Sub-Categorized Dashboard Files Display */}
        {!search && nav.subject && resources && (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <h2 className="font-bold text-xl text-gray-800">{nav.subject}</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleRenameSubject(nav.subject)}
                  className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md font-medium hover:bg-blue-100 transition"
                >
                  ✏️ Rename
                </button>
                <button 
                  onClick={() => handleDeleteSubject(nav.subject)}
                  className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-md font-medium hover:bg-red-100 transition"
                >
                  🗑️ Delete Subject
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">{nav.branch} · {nav.year} · {nav.sem}</p>
            <div className="flex gap-2 mb-4 flex-wrap">
              {["books", "notes", "pyqs", "videos"].map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeTab === t ? "bg-indigo-600 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                  {TYPE_LABELS[t]} <span className="ml-1 opacity-70">({(resources[t] || []).length})</span>
                </button>
              ))}
            </div>
            {(!resources[activeTab] || resources[activeTab].length === 0) ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">📭</div>
                <p>No {activeTab} uploaded yet for this subject.</p>
                <button onClick={() => {
                  setForm({ ...emptyForm, branch: nav.branch, year: nav.year, sem: nav.sem, subject: nav.subject, type: activeTab });
                  setShowUpload(true);
                }} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Upload First Item</button>
              </div>
            ) : (
              <div className="grid gap-3">
                {resources[activeTab].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-400">By {item.uploadedBy || "Student"} · {item.date}</p>
                      {item.isFile && item.fileName && <p className="text-xs text-indigo-500 mt-0.5">📎 {item.fileName}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[activeTab]}`}>{TYPE_LABELS[activeTab]}</span>
                      <a href={item.link} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-indigo-700">
                        {item.isFile ? "📎 Open File" : "🔗 Open Link"}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal Container */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold mb-4 text-gray-800">⬆ Upload Resource</h3>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase -mb-1">Target Mapping</label>
              <select value={form.branch} onChange={e => setForm(f => ({...f, branch: e.target.value, year:"", sem:"", subject:""}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
                <option value="">Select Branch</option>
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
              <select value={form.year} onChange={e => setForm(f => ({...f, year: e.target.value, sem:"", subject:""}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white" disabled={!form.branch}>
                <option value="">Select Year</option>
                {formYears.map(y => <option key={y}>{y}</option>)}
              </select>
              <select value={form.sem} onChange={e => setForm(f => ({...f, sem: e.target.value, subject:""}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white" disabled={!form.year}>
                <option value="">Select Semester</option>
                {formSems.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white" disabled={!form.sem}>
                <option value="">Select Subject</option>
                {formSubjects.map(s => <option key={s}>{s}</option>)}
              </select>

              <hr className="border-gray-100 my-2" />
              <label className="block text-xs font-semibold text-gray-500 uppercase -mb-1">Resource Details</label>
              
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="Resource Title (e.g. Unit 1 Notes)" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
              
              <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
                <option value="books">📘 Book</option>
                <option value="notes">📝 Note</option>
                <option value="pyqs">📄 PYQ</option>
                <option value="videos">🎥 Video</option>
              </select>

              {/* PDF/Local File Attachment Block */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 bg-gray-50">
                <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Attach Local File</p>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file && file.size > 5 * 1024 * 1024) {
                      alert("File size limit is 5MB!");
                      e.target.value = "";
                      setUploadFile(null);
                    } else {
                      setUploadFile(file || null);
                    }
                  }}
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadFile && (
                  <div className="mt-2 flex items-center justify-between bg-indigo-50 rounded-lg px-2 py-1">
                    <span className="text-xs text-indigo-700 truncate max-w-[220px]">📄 {uploadFile.name}</span>
                    <button onClick={() => setUploadFile(null)} className="text-red-500 text-xs font-bold p-1">✕</button>
                  </div>
                )}
              </div>

              {!uploadFile && (
                <>
                  <p className="text-center text-xs text-gray-400 my-1">— OR USE EXTERNAL LINK —</p>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="https://... (URL to resource)" value={form.link} onChange={e => setForm(f => ({...f, link: e.target.value}))} />
                </>
              )}
            </div>
            
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {uploading ? "Uploading... ⏳" : "Upload"}
              </button>
              <button onClick={() => { setShowUpload(false); setForm(emptyForm); setUploadFile(null); }} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal Container */}
      {showAddSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-800">➕ Add New Subject</h3>
            <div className="space-y-3">
              <select value={subForm.branch} onChange={e => setSubForm(f => ({...f, branch: e.target.value, year:"", sem:"", subject:""}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white">
                <option value="">Select Branch</option>
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
              <select value={subForm.year} onChange={e => setSubForm(f => ({...f, year: e.target.value, sem:"", subject:""}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white" disabled={!subForm.branch}>
                <option value="">Select Year</option>
                {subYears.map(y => <option key={y}>{y}</option>)}
              </select>
              <select value={subForm.sem} onChange={e => setSubForm(f => ({...f, sem: e.target.value, subject:""}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white" disabled={!subForm.year}>
                <option value="">Select Semester</option>
                {subSems.map(s => <option key={s}>{s}</option>)}
              </select>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="Subject Name (e.g. Data Structures)" value={subForm.subject} onChange={e => setSubForm(f => ({...f, subject: e.target.value}))} />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAddSubject} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition">Add Subject</button>
              <button onClick={() => { setShowAddSubject(false); setSubForm({ branch: "", year: "", sem: "", subject: "" }); }} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}