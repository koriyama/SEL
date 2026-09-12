// src/pages/TeacherCsvImport.jsx
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getClassById, importStudentsCsv } from '../lib/lmsApi';

// Minimal CSV parser. Handles quoted fields.
function parseCsv(text) {
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cur.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idxId = header.indexOf('institutional_id');
  const idxName = header.indexOf('display_name');
  const idxPass = header.indexOf('password');

  if (idxId === -1 || idxName === -1) {
    throw new Error(
      'CSV must have columns "institutional_id" and "display_name". A "password" column is optional.'
    );
  }

  return rows.slice(1).map((r, i) => ({
    rowNumber: i + 2,
    institutional_id: (r[idxId] || '').trim(),
    display_name: (r[idxName] || '').trim(),
    password: idxPass >= 0 ? (r[idxPass] || '').trim() : '',
  }));
}

const TeacherCsvImport = () => {
  const { id } = useParams();
  const [cls, setCls] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await getClassById(id);
        setCls(c);
      } catch (err) {
        console.error(err);
        toast.error('Could not load class.');
      }
    })();
  }, [id]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setParsedRows([]);
    setResults(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const objects = rowsToObjects(rows);
      if (objects.length === 0) {
        throw new Error('No student rows found in the file.');
      }
      setParsedRows(objects);
    } catch (err) {
      setParseError(err.message || 'Could not read CSV.');
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      const payload = parsedRows.map((r) => ({
        institutional_id: r.institutional_id,
        display_name: r.display_name,
        password: r.password || undefined,
      }));
      const response = await importStudentsCsv({ students: payload, classId: id });
      setResults(response?.results || []);
      const created = (response?.results || []).filter((r) => r.status === 'created').length;
      const existing = (response?.results || []).filter((r) => r.status === 'already_exists').length;
      const errored = (response?.results || []).filter((r) => r.status === 'error').length;
      toast.success(
        `Done. Created: ${created}, already existed: ${existing}, errors: ${errored}.`
      );
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const downloadResultsCsv = () => {
    if (!results) return;
    const header = 'institutional_id,display_name,status,temp_password,error\n';
    const lines = results.map((r) => {
      const safe = (v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`;
      return [
        safe(r.institutional_id),
        safe(r.display_name),
        safe(r.status),
        safe(r.temp_password || ''),
        safe(r.error || ''),
      ].join(',');
    });
    const csv = header + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-results-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link
            to={`/classes/${id}`}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← Back to class
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Import students{cls ? ` into ${cls.name}` : ''}
          </h1>
        </div>

        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            CSV format
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Your CSV must have a header row. Required columns:{' '}
            <code className="mx-1 px-1 bg-gray-100 rounded">institutional_id</code>
            and{' '}
            <code className="mx-1 px-1 bg-gray-100 rounded">display_name</code>.
            Optional column:{' '}
            <code className="mx-1 px-1 bg-gray-100 rounded">password</code> (if
            you leave it out, temporary passwords will be generated).
          </p>
          <pre className="bg-gray-50 p-3 rounded text-xs text-gray-700 overflow-x-auto">
{`institutional_id,display_name,password
12345678,Yuki Tanaka,
87654321,Kenji Sato,
11112222,Aiko Suzuki,changeme123`}
          </pre>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose CSV file
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-sm text-gray-700"
          />
          {fileName && (
            <p className="text-xs text-gray-500 mt-2">Selected: {fileName}</p>
          )}
          {parseError && (
            <p className="text-sm text-red-600 mt-2">{parseError}</p>
          )}
        </section>

        {parsedRows.length > 0 && (
          <section className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Preview ({parsedRows.length} rows)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Institutional ID</th>
                    <th className="text-left px-3 py-2">Display name</th>
                    <th className="text-left px-3 py-2">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((r) => (
                    <tr key={r.rowNumber} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-500">{r.rowNumber}</td>
                      <td className="px-3 py-2">{r.institutional_id}</td>
                      <td className="px-3 py-2">{r.display_name}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {r.password ? '••••••' : 'auto-generate'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="inline-flex py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing
                  ? 'Importing…'
                  : `Import ${parsedRows.length} students`}
              </button>
            </div>
          </section>
        )}

        {results && (
          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Import results
              </h2>
              <button
                type="button"
                onClick={downloadResultsCsv}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Download results CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Institutional ID</th>
                    <th className="text-left px-3 py-2">Display name</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Temporary password</th>
                    <th className="text-left px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2">{r.institutional_id}</td>
                      <td className="px-3 py-2">{r.display_name}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            r.status === 'created'
                              ? 'text-green-700'
                              : r.status === 'already_exists'
                              ? 'text-gray-500'
                              : 'text-red-600'
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {r.temp_password || ''}
                      </td>
                      <td className="px-3 py-2 text-red-600">
                        {r.error || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default TeacherCsvImport;