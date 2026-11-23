import { Cpu, Database, Lock, Layers, ShieldCheck } from 'lucide-react';

export function AboutPage() {
  const units = [
    {
      unit: 'Unit I — Introduction to C',
      topics:
        'Variables, primitive data types, arithmetic & logical operators, if/else validation, loops, and structured control flow across request handlers.',
    },
    {
      unit: 'Unit II — Arrays',
      topics:
        'One-dimensional arrays of Item and Claim records, linear searching, multi-criteria filtering, and bubble sorting by report date or match score.',
    },
    {
      unit: 'Unit III — Functions & Pointers',
      topics:
        'Modular .h/.c function prototypes, pass-by-pointer updates, custom string tokenization, case-insensitive matching, and JSON buffer builders.',
    },
    {
      unit: 'Unit IV — Structures',
      topics:
        'Student, Item (with nested Student reporter), Claim, AdminRecord, and MatchResult structures passed via structure pointers.',
    },
    {
      unit: 'Unit V — Binary Files & Operations',
      topics:
        'Persistent fopen(), fclose(), fread(), fwrite() over lost.dat, found.dat, claims.dat, and admin.dat with magic headers and safe temp-file rewrites.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-4">
        <p className="text-xs font-semibold text-[#0D9488]">
          CSA02 C Programming Capstone Project
        </p>
        <h1 className="font-display text-3xl font-bold text-[#0F294A]">
          About CampusFind
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          CampusFind is a web-based Campus Lost and Found Management System engineered with a
          modular C HTTP backend and binary file storage. It replaces fragmented campus notice
          boards and chat messages with a structured reporting, smart matching, and verified claim
          recovery workflow.
        </p>
      </div>

      {/* Core Objectives & Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#0F294A]">
            <Layers className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold">Project Objectives</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
            <li>Centralize campus lost and found reporting with unique IDs.</li>
            <li>Persist all records permanently using C binary files (.dat).</li>
            <li>Surface probable matches using a transparent 100-point C scoring algorithm.</li>
            <li>Protect student privacy by redacting ID card details and contact info publicly.</li>
            <li>Enforce administrator verification before marking any item Returned.</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#0F294A]">
            <Cpu className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold">Technology Stack</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <strong className="text-slate-800">Backend Engine:</strong> Modular C11 compiled via
              GCC with cross-platform TCP HTTP/1.1 sockets (POSIX / Winsock2).
            </li>
            <li>
              <strong className="text-slate-800">Data Persistence:</strong> Binary files (
              <span className="font-mono text-xs">lost.dat</span>,{' '}
              <span className="font-mono text-xs">found.dat</span>,{' '}
              <span className="font-mono text-xs">claims.dat</span>,{' '}
              <span className="font-mono text-xs">admin.dat</span>).
            </li>
            <li>
              <strong className="text-slate-800">Frontend Interface:</strong> Responsive web UI
              communicating exclusively via JSON over HTTP Fetch API.
            </li>
          </ul>
        </div>
      </div>

      {/* C Syllabus Mapping */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-[#0F294A]">
          <Database className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold">
            CSA02 C Programming Syllabus Mapping
          </h2>
        </div>

        <div className="divide-y divide-slate-200">
          {units.map((u) => (
            <div key={u.unit} className="py-4 first:pt-0 last:pb-0">
              <h3 className="font-display font-semibold text-sm text-[#0F294A]">{u.unit}</h3>
              <p className="text-sm text-slate-600 mt-1">{u.topics}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Prototype Scope */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-[#0F294A]">
          <ShieldCheck className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold">
            Security Safeguards &amp; Capstone Limitations
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-teal-700" aria-hidden="true" />
              Implemented Safeguards
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Server-side salted SHA-256 hashing for admin credentials in admin.dat.</li>
              <li>Bearer session tokens verified by the C server before admin mutations.</li>
              <li>Fixed-width bounded string copies preventing buffer overflows.</li>
              <li>Public redaction of ID card descriptions and reporter contact details.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800">
              Production Upgrade Considerations
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Add TLS/HTTPS termination (reverse proxy such as Nginx) for public networks.</li>
              <li>Integrate university SSO / OAuth2 for verified student identity lookup.</li>
              <li>Migrate from local binary files to a multi-worker ACID SQL database at scale.</li>
              <li>Add rate-limiting and persistent audit logging for high-traffic deployments.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
