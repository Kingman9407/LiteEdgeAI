"use client";

import { useState } from "react";
import { usePhotos } from "./componets/photos";
import { ProcessingOverlay } from "./componets/ProcessingOverlay";
import { faceService } from "./componets/faceService";
import { chineseWhispers } from "./componets/clusterService";
// FIX: import BLUR_THRESHOLD so the sharp filter uses the same value as the pipeline
import { BLUR_THRESHOLD } from "./componets/imageAnalysis";

export default function Page() {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [search, setSearch] = useState("");
    const [dragging, setDragging] = useState(false);

    // Filters for the active group
    const [filterSharp, setFilterSharp] = useState(false);
    const [filterFace, setFilterFace] = useState(false);
    const [filterEyesOpen, setFilterEyesOpen] = useState(false);
    const [groupInline, setGroupInline] = useState(false);

    const {
        groups,
        activeGroup,
        activeGroupData,
        newGroupName,
        showNewGroup,
        lightbox,
        totalFiles,
        fileRef,
        folderRef,
        hydrated,
        processingStage,
        setActiveGroup,
        setNewGroupName,
        setShowNewGroup,
        setLightbox,
        handleFiles,
        handleFolder,
        createGroup,
        deleteGroup,
        triggerFileInput,
        triggerFolderInput,
        groupByFace,
        deleteAll,
    } = usePhotos();

    const filtered = groups.filter((g: any) =>
        g.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-[#0e0f11] text-[#f2f3f5]">

            {/* 5-Stage Processing Overlay */}
            <ProcessingOverlay stage={processingStage} />

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={() => setLightbox(null)}
                >
                    <button
                        className="absolute top-5 right-6 text-[#888] hover:text-white text-2xl bg-transparent border-none cursor-pointer"
                        onClick={() => setLightbox(null)}
                    >✕</button>
                    <img
                        src={lightbox}
                        alt=""
                        className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                        loading="eager"
                    />
                </div>
            )}

            {/* New Group Modal */}
            {showNewGroup && (
                <div
                    className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center"
                    onClick={() => setShowNewGroup(false)}
                >
                    <div
                        className="bg-[#16181c] border border-[#1f2227] rounded-xl p-7 w-80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-sm font-semibold mb-4">New Group</h3>
                        <input
                            className="w-full bg-[#0e0f11] border border-[#1f2227] focus:border-[#3fa77a]/50 rounded-lg text-sm px-3 py-2 text-[#f2f3f5] placeholder-[#454851] outline-none mb-3"
                            placeholder="Group name…"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && createGroup()}
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                className="px-4 py-2 rounded-lg text-xs text-[#888c96] border border-[#1f2227] hover:text-white hover:border-[#3fa77a]/30 transition"
                                onClick={() => setShowNewGroup(false)}
                            >Cancel</button>
                            <button
                                className="px-4 py-2 rounded-lg text-xs bg-[#3fa77a] hover:bg-[#357a5a] text-white font-medium transition"
                                onClick={createGroup}
                            >Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="sticky top-0 z-30 bg-[#0e0f11] border-b border-[#1a1c21] px-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between h-14">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold tracking-tight">Folios</span>
                        {processingStage.step !== "idle" && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full animate-pulse border border-emerald-500/20">
                                Processing…
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="px-4 py-2 rounded-lg text-xs text-[#888c96] border border-[#1f2227] hover:text-white hover:border-[#3fa77a]/30 transition"
                            onClick={triggerFolderInput}
                        >📁 Folder</button>
                        <button
                            className="px-4 py-2 rounded-lg text-xs text-[#888c96] border border-[#1f2227] hover:text-white hover:border-[#3fa77a]/30 transition"
                            onClick={triggerFileInput}
                        >Upload</button>
                        <button
                            className="px-4 py-2 rounded-lg text-xs bg-[#3fa77a] hover:bg-[#357a5a] text-white font-medium transition"
                            onClick={() => setShowNewGroup(true)}
                        >+ New Group</button>
                    </div>
                </div>
            </nav>

            {/* Hidden file inputs */}
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />
            <input
                ref={folderRef}
                type="file"
                // @ts-expect-error — non-standard but widely supported
                webkitdirectory=""
                mozdirectory=""
                multiple
                className="hidden"
                onChange={(e) => { handleFolder(e.target.files); e.target.value = ""; }}
            />

            {/* Loading skeleton while IndexedDB hydrates */}
            {!hydrated && (
                <div className="max-w-6xl mx-auto px-8 py-9">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-[#16181c] border border-[#1f2227] rounded-xl overflow-hidden animate-pulse">
                                <div className="aspect-[4/3] bg-[#1a1c21]" />
                                <div className="px-3 py-2.5 flex gap-2">
                                    <div className="h-3 bg-[#1f2227] rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {hydrated && (
                <div className="max-w-6xl mx-auto px-8 py-9">

                    {/* ── Group Detail ── */}
                    {activeGroupData ? (
                        <div>
                            <div className="flex items-center justify-between mb-7">
                                <div className="flex items-center gap-4">
                                    <button
                                        className="text-[#888c96] hover:text-white text-xs flex items-center gap-1 transition"
                                        onClick={() => setActiveGroup(null)}
                                    >← Back</button>
                                    <div>
                                        <h1 className="text-xl font-bold">{activeGroupData.name}</h1>
                                        <p className="text-[#555a66] text-xs mt-0.5">
                                            {activeGroupData.files.length} items · {activeGroupData.date}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className={`px-4 py-2 rounded-lg text-xs border transition ${groupInline
                                                ? "text-blue-400 border-blue-400 bg-blue-400/10"
                                                : "text-blue-400/70 border-blue-400/20 hover:bg-blue-400/10"
                                            }`}
                                        onClick={() => setGroupInline(!groupInline)}
                                    >{groupInline ? "Ungroup Faces" : "Group by Face"}</button>
                                    <button
                                        className="px-4 py-2 rounded-lg text-xs text-[#888c96] border border-[#1f2227] hover:text-white hover:border-[#3fa77a]/30 transition"
                                        onClick={triggerFileInput}
                                    >+ Add Photos</button>
                                    <button
                                        className="px-3 py-2 rounded-lg text-xs text-red-400 border border-red-400/20 hover:bg-red-400/10 transition"
                                        onClick={() => deleteGroup(activeGroupData.id)}
                                    >Delete</button>
                                </div>
                            </div>

                            {/* Filter Bar */}
                            {activeGroupData.files.length > 0 && (
                                <div className="flex gap-2 mb-6 border-b border-[#1f2227] pb-4 flex-wrap">
                                    <button
                                        className={`px-3 py-1.5 rounded-full text-xs transition ${!filterSharp && !filterFace && !filterEyesOpen
                                                ? "bg-[#3fa77a] text-white"
                                                : "bg-[#1f2227] text-[#888c96] hover:text-white hover:bg-[#2a2d35]"
                                            }`}
                                        onClick={() => {
                                            setFilterSharp(false);
                                            setFilterFace(false);
                                            setFilterEyesOpen(false);
                                        }}
                                    >All Photos</button>
                                    <div className="w-px h-6 bg-[#1f2227] mx-2 self-center" />
                                    <button
                                        className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition ${filterSharp
                                                ? "bg-[#3fa77a]/20 text-[#3fa77a] border border-[#3fa77a]/50"
                                                : "bg-[#1f2227] border border-transparent text-[#888c96] hover:text-white"
                                            }`}
                                        onClick={() => setFilterSharp(!filterSharp)}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${filterSharp ? "bg-[#3fa77a]" : "bg-[#555a66]"}`} />
                                        Sharp Only
                                    </button>
                                    <button
                                        className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition ${filterFace
                                                ? "bg-[#3fa77a]/20 text-[#3fa77a] border border-[#3fa77a]/50"
                                                : "bg-[#1f2227] border border-transparent text-[#888c96] hover:text-white"
                                            }`}
                                        onClick={() => setFilterFace(!filterFace)}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${filterFace ? "bg-[#3fa77a]" : "bg-[#555a66]"}`} />
                                        Has Face
                                    </button>
                                    <button
                                        className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition ${filterEyesOpen
                                                ? "bg-[#3fa77a]/20 text-[#3fa77a] border border-[#3fa77a]/50"
                                                : "bg-[#1f2227] border border-transparent text-[#888c96] hover:text-white"
                                            }`}
                                        onClick={() => setFilterEyesOpen(!filterEyesOpen)}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${filterEyesOpen ? "bg-[#3fa77a]" : "bg-[#555a66]"}`} />
                                        Eyes Open
                                    </button>
                                </div>
                            )}

                            {/* File grid */}
                            {(() => {
                                let displayFiles = activeGroupData.files;

                                // FIX: use imported BLUR_THRESHOLD (100) — not hardcoded 100
                                // FIX: default ?? 0 so unscored files don't pretend to be sharp
                                if (filterSharp)
                                    displayFiles = displayFiles.filter(
                                        (f) => (f.blurScore ?? 0) >= BLUR_THRESHOLD
                                    );
                                if (filterFace)
                                    displayFiles = displayFiles.filter((f) => f.hasFace);
                                if (filterEyesOpen)
                                    displayFiles = displayFiles.filter((f) => !f.eyesClosed && f.hasFace);

                                // Inline face grouping
                                let displayGroups: { name: string; files: any[] }[] = [];

                                if (groupInline && displayFiles.length > 0) {
                                    const unassigned: any[] = [];
                                    const facePairs: { emb: number[], file: any }[] = [];

                                    displayFiles.forEach((file) => {
                                        if (!file.embeddings || file.embeddings.length === 0) {
                                            unassigned.push(file);
                                        } else {
                                            facePairs.push({ emb: file.embeddings[0], file });
                                        }
                                    });

                                    const faceGroupsMap = new Map<number, Set<any>>();

                                    if (facePairs.length > 0) {
                                        // Use Chinese Whispers (matches Python photo.py exactly) with threshold 0.68
                                        const labels = chineseWhispers(facePairs.map((p) => p.emb), 0.68);
                                        
                                        for (let i = 0; i < labels.length; i++) {
                                            const label = labels[i];
                                            if (!faceGroupsMap.has(label)) {
                                                faceGroupsMap.set(label, new Set());
                                            }
                                            faceGroupsMap.get(label)!.add(facePairs[i].file);
                                        }
                                    }

                                    // Convert maps back to groups for display
                                    displayGroups = Array.from(faceGroupsMap.values()).map((filesSet, i) => ({
                                        name: `Person ${i + 1}`,
                                        files: Array.from(filesSet),
                                    }));
                                    if (unassigned.length > 0) {
                                        displayGroups.push({ name: "Other / No Face", files: unassigned });
                                    }
                                } else {
                                    displayGroups = [{ name: "All", files: displayFiles }];
                                }

                                return (
                                    <>
                                        {activeGroupData.files.length === 0 ? (
                                            // Empty drop zone
                                            <div
                                                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${dragging
                                                        ? "border-[#3fa77a]/40 bg-[#3fa77a]/5"
                                                        : "border-[#1f2227] hover:border-[#3fa77a]/30 hover:bg-[#3fa77a]/5"
                                                    }`}
                                                onClick={triggerFileInput}
                                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                                onDragLeave={() => setDragging(false)}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setDragging(false);
                                                    handleFiles(e.dataTransfer.files);
                                                }}
                                            >
                                                <div className="text-3xl mb-3 text-[#2a2d35]">⬆</div>
                                                <p className="text-[#555a66] text-sm">Drop photos here or click to upload</p>
                                            </div>
                                        ) : displayFiles.length === 0 ? (
                                            <div className="text-center py-20 text-[#555a66]">
                                                No photos match the selected filters.
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-8 pb-12">
                                                {displayGroups.map((g, groupIdx) => (
                                                    <div key={groupIdx}>
                                                        {groupInline && (
                                                            <h2 className="text-sm font-medium text-[#888c96] mb-3">
                                                                {g.name} ({g.files.length})
                                                            </h2>
                                                        )}
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                            {g.files.map((file: any, i: number) => {
                                                                // FIX: isBlurry uses BLUR_THRESHOLD, not hardcoded 100
                                                                const isBlurry = (file.blurScore ?? -1) >= 0
                                                                    && file.blurScore < BLUR_THRESHOLD;

                                                                return (
                                                                    <div
                                                                        key={file.key ?? i}
                                                                        className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative bg-[#1a1c21]"
                                                                        onClick={() => setLightbox(file.url)}
                                                                    >
                                                                        <img
                                                                            src={file.thumbUrl ?? file.url}
                                                                            alt=""
                                                                            loading="lazy"
                                                                            decoding="async"
                                                                            className={`w-full h-full object-cover group-hover:scale-105 transition duration-200 ${isBlurry ? "opacity-70 blur-[1px] grayscale-[50%]" : ""
                                                                                }`}
                                                                        />

                                                                        {/* Status badges */}
                                                                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                                                                            {isBlurry && (
                                                                                <span className="bg-red-500/90 text-white text-[0.6rem] px-1.5 py-0.5 rounded shadow-sm font-medium backdrop-blur-sm">
                                                                                    Blurry
                                                                                </span>
                                                                            )}
                                                                            {file.eyesClosed && (
                                                                                <span className="bg-amber-500/90 text-white text-[0.6rem] px-1.5 py-0.5 rounded shadow-sm font-medium backdrop-blur-sm">
                                                                                    Eyes Closed
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Face embedding dot indicators */}
                                                                        {file.embeddings && file.embeddings.length > 0 && (
                                                                            <div className="absolute top-2 right-2 flex gap-1">
                                                                                {file.embeddings.map((_: any, idx: number) => (
                                                                                    <div
                                                                                        key={idx}
                                                                                        className="w-1.5 h-1.5 bg-blue-400 rounded-full border border-black"
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Add photo tile */}
                                                            {!groupInline && groupIdx === 0 && (
                                                                <div
                                                                    className="aspect-square rounded-lg border-2 border-dashed border-[#1f2227] hover:border-[#3fa77a]/40 flex items-center justify-center cursor-pointer text-[#2a2d35] hover:text-[#3fa77a]/50 text-2xl transition"
                                                                    onClick={triggerFileInput}
                                                                >+</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        /* ── Groups list / grid ── */
                        <>
                            {/* Stats */}
                            <div className="flex gap-3 mb-8 flex-wrap">
                                {[
                                    ["" + totalFiles, "Total Files"],
                                    ["" + groups.length, "Groups"],
                                ].map(([n, l]) => (
                                    <div key={l} className="bg-[#16181c] border border-[#1f2227] rounded-lg px-5 py-3 text-center">
                                        <div className="text-2xl font-bold text-[#3fa77a]">{n}</div>
                                        <div className="text-[0.65rem] text-[#555a66] uppercase tracking-widest mt-1">{l}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                                <input
                                    className="bg-[#16181c] border border-[#1f2227] focus:border-[#3fa77a]/40 rounded-lg text-xs px-3 py-2 text-[#f2f3f5] placeholder-[#454851] outline-none w-52 transition"
                                    placeholder="Search groups…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <div className="flex gap-1.5">
                                    {(["grid", "list"] as const).map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => setView(v)}
                                            className={`px-4 py-2 rounded-lg text-xs border transition capitalize ${view === v
                                                    ? "border-[#3fa77a]/40 text-[#3fa77a] bg-[#3fa77a]/10"
                                                    : "border-[#1f2227] text-[#888c96] hover:text-white hover:border-[#3fa77a]/20"
                                                }`}
                                        >{v}</button>
                                    ))}
                                    {groups.length > 0 && (
                                        <button
                                            className="px-4 py-2 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition ml-2"
                                            onClick={deleteAll}
                                        >Delete All</button>
                                    )}
                                </div>
                            </div>

                            {/* Empty drop zone */}
                            {groups.length === 0 && (
                                <div
                                    className={`border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition mb-6 ${dragging
                                            ? "border-[#3fa77a]/40 bg-[#3fa77a]/5"
                                            : "border-[#1f2227] hover:border-[#3fa77a]/30 hover:bg-[#3fa77a]/5"
                                        }`}
                                    onClick={triggerFileInput}
                                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDragging(false);
                                        handleFiles(e.dataTransfer.files);
                                    }}
                                >
                                    <div className="text-4xl mb-3 text-[#2a2d35]">⬆</div>
                                    <p className="text-[#888c96] text-sm mb-1">Drop photos to auto-create a group</p>
                                    <p className="text-[#454851] text-xs">or click to browse files</p>
                                </div>
                            )}

                            {/* Groups Grid */}
                            {filtered.length > 0 && view === "grid" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {filtered.map((g: any) => (
                                        <div
                                            key={g.id}
                                            onClick={() => setActiveGroup(g.id)}
                                            className={`bg-[#16181c] border rounded-xl overflow-hidden cursor-pointer transition hover:-translate-y-0.5 ${activeGroup === g.id
                                                    ? "border-[#3fa77a]"
                                                    : "border-[#1f2227] hover:border-[#3fa77a]/40"
                                                }`}
                                        >
                                            <div className="grid grid-cols-2 gap-px aspect-[4/3]">
                                                {[0, 1, 2, 3].map((i) =>
                                                    g.files[i] ? (
                                                        <img
                                                            key={i}
                                                            src={g.files[i].thumbUrl ?? g.files[i].url}
                                                            alt=""
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div key={i} className="bg-[#1a1c21] flex items-center justify-center text-[#2a2d35] text-lg">✦</div>
                                                    )
                                                )}
                                            </div>
                                            <div className="px-3 py-2.5 flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs font-semibold">{g.name}</div>
                                                    <div className="text-[0.68rem] text-[#555a66] mt-0.5">{g.date}</div>
                                                </div>
                                                <span className="text-[0.65rem] font-semibold text-[#3fa77a] bg-[#3fa77a]/10 border border-[#3fa77a]/20 rounded-full px-2.5 py-0.5">
                                                    {g.files.length}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Groups List */}
                            {filtered.length > 0 && view === "list" && (
                                <div className="flex flex-col gap-2">
                                    {filtered.map((g: any) => (
                                        <div
                                            key={g.id}
                                            onClick={() => setActiveGroup(g.id)}
                                            className={`flex items-center gap-3 px-4 py-3 bg-[#16181c] border rounded-xl cursor-pointer transition ${activeGroup === g.id
                                                    ? "border-[#3fa77a]"
                                                    : "border-[#1f2227] hover:border-[#3fa77a]/30"
                                                }`}
                                        >
                                            {g.files[0] ? (
                                                <img
                                                    src={g.files[0].thumbUrl ?? g.files[0].url}
                                                    alt=""
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-14 h-10 rounded-md object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-14 h-10 rounded-md bg-[#1a1c21] flex items-center justify-center text-[#2a2d35] flex-shrink-0">✦</div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold truncate">{g.name}</div>
                                                <div className="text-[0.68rem] text-[#555a66] mt-0.5">{g.date}</div>
                                            </div>
                                            <span className="text-[0.65rem] font-semibold text-[#3fa77a] bg-[#3fa77a]/10 border border-[#3fa77a]/20 rounded-full px-2.5 py-0.5 flex-shrink-0">
                                                {g.files.length} items
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </main>
    );
}