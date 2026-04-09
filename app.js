document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const setlistContainer = document.getElementById('setlist-container');
    const newSetlistBtn = document.getElementById('new-setlist-btn');
    const VALID_SONG_KEYS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];
    
    const activeSetlistTitle = document.getElementById('active-setlist-title');
    const emptyState = document.getElementById('empty-state');
    const emptyStateMessage = document.getElementById('empty-state-message');
    const setlistContent = document.getElementById('setlist-content');
    const manualSongBtn = document.getElementById('manual-song-btn');
    const manualSongHeaderBtn = document.getElementById('manual-song-header-btn');
    
    const aiGenerateBtn = document.getElementById('ai-generate-btn');
    const aiModalOverlay = document.getElementById('ai-modal-overlay');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addSongInputBtn = document.getElementById('add-song-input-btn');
    const songInputsContainer = document.getElementById('song-inputs-container');
    const submitAiGenerateBtn = document.getElementById('submit-ai-generate-btn');
    const newSetlistModalOverlay = document.getElementById('new-setlist-modal-overlay');
    const closeNewSetlistModalBtn = document.getElementById('close-new-setlist-modal-btn');
    const newSetlistForm = document.getElementById('new-setlist-form');
    const newSetlistNameInput = document.getElementById('new-setlist-name');
    const manualSongModalOverlay = document.getElementById('manual-song-modal-overlay');
    const manualSongBackBtn = document.getElementById('manual-song-back-btn');
    const manualSongForm = document.getElementById('manual-song-form');
    const manualSongTitleInput = document.getElementById('manual-song-title');
    const manualSongArtistInput = document.getElementById('manual-song-artist');
    const manualSongOriginalKeyInput = document.getElementById('manual-song-original-key');
    const manualSongTransposeKeyInput = document.getElementById('manual-song-transpose-key');
    const manualSongYoutubeUrlInput = document.getElementById('manual-song-youtube-url');
    const manualSongNotesInput = document.getElementById('manual-song-notes');
    const manualSongChordsInput = document.getElementById('manual-song-chords');
    const manualYoutubePreview = document.getElementById('manual-youtube-preview');
    const autoFillManualSongBtn = document.getElementById('auto-fill-manual-song-btn');

    // === State Management ===
    let setlists = [];
    let activeSetlistId = null;
    let songInputCount = 0;

    // === Initialization ===
    function init() {
        loadFromLocalStorage();
        renderSetlists();
        updateActiveSetlistView();
    }

    function getActiveSetlist() {
        return setlists.find(setlist => setlist.id === activeSetlistId);
    }

    function updateBodyModalState() {
        const isAnyModalOpen =
            !aiModalOverlay.classList.contains('hidden') ||
            !newSetlistModalOverlay.classList.contains('hidden') ||
            !manualSongModalOverlay.classList.contains('hidden');
        document.body.classList.toggle('modal-open', isAnyModalOpen);
    }

    function escapeHtml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatMultilineText(value = '') {
        return escapeHtml(value).replace(/\n/g, '<br>');
    }

    function normalizeSongKey(value = '') {
        const key = String(value).trim();
        return VALID_SONG_KEYS.includes(key) ? key : '';
    }

    async function postGrokAction(action, payload = {}) {
        const response = await fetch('/api/grok', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, payload })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `API returned status ${response.status}`);
        }

        return data;
    }

    function getYouTubeVideoId(url = '') {
        const trimmed = url.trim();
        if (!trimmed) return '';

        const fallbackIdMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
        if (fallbackIdMatch) return fallbackIdMatch[0];

        try {
            const parsedUrl = new URL(trimmed);
            const host = parsedUrl.hostname.replace(/^www\./, '');

            if (host === 'youtu.be') {
                const shortId = parsedUrl.pathname.split('/').filter(Boolean)[0];
                return /^[a-zA-Z0-9_-]{11}$/.test(shortId || '') ? shortId : '';
            }

            if (!host.endsWith('youtube.com')) return '';

            const videoId = parsedUrl.searchParams.get('v');
            if (/^[a-zA-Z0-9_-]{11}$/.test(videoId || '')) {
                return videoId;
            }

            const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
            const embeddedId = pathParts.length >= 2 ? pathParts[1] : '';
            if (
                ['embed', 'shorts', 'live'].includes(pathParts[0]) &&
                /^[a-zA-Z0-9_-]{11}$/.test(embeddedId || '')
            ) {
                return embeddedId;
            }
        } catch (error) {
            return '';
        }

        return '';
    }

    function renderManualYoutubePlaceholder(message = 'Add a YouTube URL to play the song') {
        manualYoutubePreview.classList.remove('has-video');
        manualYoutubePreview.innerHTML = `
            <div class="manual-youtube-placeholder">
                <i class="fab fa-youtube"></i>
                <p>${escapeHtml(message)}</p>
                <span>Note: Audio transposition requires Chrome Extension bridge</span>
            </div>
        `;
    }

    function updateManualYoutubePreview() {
        const youtubeUrl = manualSongYoutubeUrlInput.value.trim();
        const youtubeId = getYouTubeVideoId(youtubeUrl);

        if (!youtubeUrl) {
            renderManualYoutubePlaceholder();
            return;
        }

        if (!youtubeId) {
            renderManualYoutubePlaceholder('Paste a valid YouTube URL to preview the song');
            return;
        }

        manualYoutubePreview.classList.add('has-video');
        manualYoutubePreview.innerHTML = `
            <div class="manual-youtube-frame">
                <iframe
                    src="https://www.youtube.com/embed/${youtubeId}?rel=0"
                    title="YouTube player preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                ></iframe>
            </div>
        `;
    }

    function resetManualSongForm() {
        manualSongForm.reset();
        manualSongTitleInput.value = 'New Song';
        manualSongOriginalKeyInput.value = 'C';
        manualSongTransposeKeyInput.value = 'C';
        renderManualYoutubePlaceholder();
    }

    function applyManualSongDraft(draft = {}) {
        const currentTitle = manualSongTitleInput.value.trim();
        const currentArtist = manualSongArtistInput.value.trim();
        const suggestedOriginalKey = normalizeSongKey(draft.originalKey);
        const suggestedTransposeKey = normalizeSongKey(draft.transposeTo);

        if (draft.title && (!currentTitle || currentTitle === 'New Song')) {
            manualSongTitleInput.value = draft.title.trim();
        }

        if (draft.artist && (!currentArtist || currentArtist === 'Unknown Artist')) {
            manualSongArtistInput.value = draft.artist.trim();
        }

        if (suggestedOriginalKey) {
            manualSongOriginalKeyInput.value = suggestedOriginalKey;
        }

        if (suggestedTransposeKey) {
            manualSongTransposeKeyInput.value = suggestedTransposeKey;
        }

        if (draft.notes && !manualSongNotesInput.value.trim()) {
            manualSongNotesInput.value = draft.notes.trim();
        }

        if (draft.chords) {
            manualSongChordsInput.value = draft.chords.trim();
        }
    }

    // === Core UI Logic ===
    function createNewSetlist(customTitle = '') {
        const newId = Date.now().toString();
        const currentDate = new Date().toLocaleDateString('en-US');
        const fallbackTitle = `SUNDAY ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`;
        
        const newSetlist = {
            id: newId,
            title: customTitle.trim() || fallbackTitle,
            date: currentDate,
            songs: []
        };
        
        setlists.push(newSetlist);
        activeSetlistId = newId;
        
        saveToLocalStorage();
        renderSetlists();
        updateActiveSetlistView();
    }

    function openNewSetlistModal() {
        newSetlistForm.reset();
        newSetlistModalOverlay.classList.remove('hidden');
        updateBodyModalState();
        newSetlistNameInput.focus();
    }

    function closeNewSetlistModal() {
        newSetlistModalOverlay.classList.add('hidden');
        updateBodyModalState();
        newSetlistForm.reset();
    }

    newSetlistBtn.addEventListener('click', openNewSetlistModal);
    closeNewSetlistModalBtn.addEventListener('click', closeNewSetlistModal);
    newSetlistModalOverlay.addEventListener('click', (event) => {
        if (event.target === newSetlistModalOverlay) {
            closeNewSetlistModal();
        }
    });

    newSetlistForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const setlistName = newSetlistNameInput.value.trim();
        createNewSetlist(setlistName);
        closeNewSetlistModal();
    });

    function renderSetlists() {
        setlistContainer.innerHTML = '';
        
        setlists.forEach(setlist => {
            const item = document.createElement('div');
            item.className = `setlist-item ${setlist.id === activeSetlistId ? 'active' : ''}`;
            
            item.innerHTML = `
                <div class="setlist-info">
                    <h3>${setlist.title}</h3>
                    <p>${setlist.songs.length} songs • ${setlist.date}</p>
                </div>
                <button class="delete-btn" title="Delete Setlist">
                    <i class="far fa-trash-alt"></i>
                </button>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) return; 
                activeSetlistId = setlist.id;
                renderSetlists();
                updateActiveSetlistView();
            });

            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                setlists = setlists.filter(s => s.id !== setlist.id);
                activeSetlistId = setlists.length > 0 ? setlists[0].id : null;
                saveToLocalStorage();
                renderSetlists();
                updateActiveSetlistView();
            });

            setlistContainer.appendChild(item);
        });
    }

    function updateActiveSetlistView() {
        if (!activeSetlistId || setlists.length === 0) {
            activeSetlistTitle.textContent = "SELECT A SETLIST";
            emptyStateMessage.textContent = 'Select or create a setlist to get started';
            manualSongBtn.classList.add('hidden');
            emptyState.classList.remove('hidden');
            setlistContent.classList.add('hidden');
            return;
        }

        const activeSetlist = getActiveSetlist();
        activeSetlistTitle.textContent = activeSetlist.title;

        if (activeSetlist.songs.length === 0) {
            emptyStateMessage.textContent = 'No songs yet';
            manualSongBtn.classList.remove('hidden');
            emptyState.classList.remove('hidden');
            setlistContent.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            setlistContent.classList.remove('hidden');
            renderSongsList(activeSetlist.songs);
        }
    }

    function renderSongsList(songs) {
        setlistContent.innerHTML = '';
        
        songs.forEach((song, index) => {
            const songEl = document.createElement('div');
            songEl.style.cssText = "border: 1px solid var(--border-color); border-radius: 22px; margin-bottom: 1rem; overflow: hidden; background: linear-gradient(180deg, rgba(51, 65, 85, 0.94) 0%, rgba(30, 41, 59, 0.98) 100%); box-shadow: var(--shadow-card);";
            
            const safeTitle = escapeHtml(song.title || 'Untitled Song');
            const safeArtist = escapeHtml(song.artist || 'Unknown Artist');
            const safeChords = escapeHtml(song.chords || 'No lyrics or chords added yet.');
            const safeNotes = song.notes ? formatMultilineText(song.notes) : '';
            const keyDetails = [];

            if (song.originalKey) {
                keyDetails.push(`Original Key: ${escapeHtml(song.originalKey)}`);
            }
            if (song.transposeTo) {
                keyDetails.push(`Transpose To: ${escapeHtml(song.transposeTo)}`);
            }

            songEl.innerHTML = `
                <div class="song-header" style="padding: 1rem 1.2rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                    <h4 style="margin:0; font-family: var(--font-heading); font-size: 1.05rem; letter-spacing: 0.01em;">${index + 1}. ${safeTitle} <span style="font-weight:500; color:var(--text-muted); font-size: 0.9em;">by ${safeArtist}</span></h4>
                    <i class="fas fa-chevron-down" style="color: var(--text-muted); transition: transform 0.2s;"></i>
                </div>
                <div class="song-details hidden" style="padding: 1.5rem; border-top: 1px solid var(--border-color); background: rgba(15, 23, 42, 0.55);">
                    ${song.youtubeId && song.youtubeId !== "null" ? `
                        <div style="position:relative; padding-bottom:56.25%; height:0; margin-bottom:1.5rem; border-radius: 8px; overflow: hidden; background: #000;">
                            <iframe style="position:absolute; top:0; left:0; width:100%; height:100%;" src="https://www.youtube.com/embed/${song.youtubeId}?rel=0" frameborder="0" allowfullscreen></iframe>
                        </div>
                    ` : ''}
                    ${keyDetails.length > 0 ? `
                        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem;">
                            ${keyDetails.map(detail => `
                                <span style="display:inline-flex; align-items:center; padding:0.38rem 0.7rem; border-radius:999px; background:rgba(126, 217, 87, 0.14); color:var(--text-soft); font-size:0.8rem; font-weight:600; border:1px solid rgba(126, 217, 87, 0.18);">
                                    ${detail}
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${safeNotes ? `
                        <div style="background: rgba(30, 41, 59, 0.95); border: 1px solid var(--border-color); border-radius: 16px; padding: 1rem 1.25rem; margin-bottom: 1rem;">
                            <h5 style="margin-bottom: 0.75rem; font-family: var(--font-heading); font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em;">Notes</h5>
                            <p style="margin: 0; white-space: normal; line-height: 1.7; color: var(--text-soft);">${safeNotes}</p>
                        </div>
                    ` : ''}
                    <div style="background: rgba(30, 41, 59, 0.95); border: 1px solid var(--border-color); border-radius: 18px; padding: 1.5rem;">
                        <h5 style="margin-bottom: 1rem; font-family: var(--font-heading); font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em;">Chord Sheet</h5>
                        <pre style="font-family: 'SFMono-Regular', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; white-space: pre-wrap; font-size: 14px; line-height: 1.72; margin: 0; color: var(--text-soft);">${safeChords}</pre>
                    </div>
                </div>
            `;

            // Accordion toggle logic
            const header = songEl.querySelector('.song-header');
            const details = songEl.querySelector('.song-details');
            const icon = songEl.querySelector('.fa-chevron-down');

            header.addEventListener('click', () => {
                const isHidden = details.classList.contains('hidden');
                // Optional: Close other open songs
                // document.querySelectorAll('.song-details').forEach(el => el.classList.add('hidden'));
                // document.querySelectorAll('.fa-chevron-down').forEach(el => el.style.transform = 'rotate(0deg)');
                
                if (isHidden) {
                    details.classList.remove('hidden');
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    details.classList.add('hidden');
                    icon.style.transform = 'rotate(0deg)';
                }
            });

            setlistContent.appendChild(songEl);
        });
    }

    // === AI Modal & Generation Logic ===
    aiGenerateBtn.addEventListener('click', () => {
        if (!activeSetlistId) {
            alert("Please select or create a setlist first.");
            return;
        }
        aiModalOverlay.classList.remove('hidden');
        updateBodyModalState();
        if (songInputCount === 0) {
            addSongBlock();
            addSongBlock();
        }
    });

    function closeAiModal() {
        aiModalOverlay.classList.add('hidden');
        updateBodyModalState();
    }
    
    closeModalBtn.addEventListener('click', closeAiModal);
    aiModalOverlay.addEventListener('click', (e) => {
        if (e.target === aiModalOverlay) closeAiModal();
    });

    function openManualSongModal() {
        if (!activeSetlistId) {
            alert("Please select or create a setlist first.");
            return;
        }

        resetManualSongForm();
        manualSongModalOverlay.classList.remove('hidden');
        updateBodyModalState();
        manualSongTitleInput.focus();
        manualSongTitleInput.select();
    }

    function closeManualSongModal() {
        manualSongModalOverlay.classList.add('hidden');
        updateBodyModalState();
        resetManualSongForm();
    }

    [manualSongBtn, manualSongHeaderBtn].forEach((button) => {
        button.addEventListener('click', openManualSongModal);
    });
    manualSongBackBtn.addEventListener('click', closeManualSongModal);
    manualSongModalOverlay.addEventListener('click', (e) => {
        if (e.target === manualSongModalOverlay) closeManualSongModal();
    });
    manualSongYoutubeUrlInput.addEventListener('input', updateManualYoutubePreview);
    autoFillManualSongBtn.addEventListener('click', async () => {
        const title = manualSongTitleInput.value.trim();
        const artist = manualSongArtistInput.value.trim();
        const youtubeUrl = manualSongYoutubeUrlInput.value.trim();
        const hasMeaningfulTitle = title && title !== 'New Song';

        if (!hasMeaningfulTitle && !youtubeUrl) {
            alert('Add a song title or YouTube URL first so the AI has something to work with.');
            manualSongTitleInput.focus();
            return;
        }

        const originalBtnText = autoFillManualSongBtn.innerHTML;
        autoFillManualSongBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Drafting...';
        autoFillManualSongBtn.disabled = true;

        try {
            const { draft } = await postGrokAction('draft-song', {
                title: hasMeaningfulTitle ? title : '',
                artist,
                youtubeUrl,
                originalKey: manualSongOriginalKeyInput.value,
                transposeTo: manualSongTransposeKeyInput.value
            });

            applyManualSongDraft(draft);
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            autoFillManualSongBtn.innerHTML = originalBtnText;
            autoFillManualSongBtn.disabled = false;
        }
    });

    manualSongForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const activeSetlist = getActiveSetlist();
        if (!activeSetlist) {
            alert("Please select or create a setlist first.");
            return;
        }

        const youtubeUrl = manualSongYoutubeUrlInput.value.trim();
        const newSong = {
            id: `manual-${Date.now()}`,
            title: manualSongTitleInput.value.trim() || 'New Song',
            artist: manualSongArtistInput.value.trim() || 'Unknown Artist',
            originalKey: manualSongOriginalKeyInput.value,
            transposeTo: manualSongTransposeKeyInput.value,
            youtubeUrl,
            youtubeId: getYouTubeVideoId(youtubeUrl) || null,
            notes: manualSongNotesInput.value.trim(),
            chords: manualSongChordsInput.value.trim()
        };

        activeSetlist.songs.push(newSong);
        saveToLocalStorage();
        renderSetlists();
        updateActiveSetlistView();
        closeManualSongModal();
    });

    function addSongBlock() {
        songInputCount++;
        const block = document.createElement('div');
        block.className = 'song-input-card';
        
        block.innerHTML = `
            <div class="song-input-header">
                <h4>Song ${songInputCount}</h4>
                <button type="button" class="delete-btn delete-song-btn" title="Remove Song">
                    <i class="far fa-trash-alt"></i>
                </button>
            </div>
            <div class="form-group">
                <input type="text" class="form-control song-title-input" placeholder="Song title (e.g., Amazing Grace)">
            </div>
            <div class="form-group">
                <input type="text" class="form-control song-url-input" placeholder="YouTube URL (optional)">
            </div>
        `;
        
        block.querySelector('.delete-song-btn').addEventListener('click', () => {
            block.remove();
            recalculateSongNumbers();
        });
        
        songInputsContainer.appendChild(block);
    }

    addSongInputBtn.addEventListener('click', addSongBlock);

    function recalculateSongNumbers() {
        const blocks = songInputsContainer.querySelectorAll('.song-input-card');
        songInputCount = 0;
        blocks.forEach(block => {
            songInputCount++;
            block.querySelector('h4').textContent = `Song ${songInputCount}`;
        });
    }

    submitAiGenerateBtn.addEventListener('click', async () => {
        // 1. Gather Prompt Data
        const theme = document.getElementById('ai-theme').value.trim();
        const occasion = document.getElementById('ai-occasion').value.trim();
        const notes = document.getElementById('ai-notes').value.trim();
        
        const specificSongs = [];
        songInputsContainer.querySelectorAll('.song-input-card').forEach(block => {
            const title = block.querySelector('.song-title-input').value.trim();
            const url = block.querySelector('.song-url-input').value.trim();
            if (title || url) specificSongs.push({ title, url });
        });

        // 2. Update UI to Loading State
        const originalBtnText = submitAiGenerateBtn.innerHTML;
        submitAiGenerateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        submitAiGenerateBtn.disabled = true;

        // 3. Fetch from the server-side AI proxy
        try {
            const { songs: newSongs } = await postGrokAction('generate-setlist', {
                theme,
                occasion,
                notes,
                specificSongs
            });
            
            // Append generated songs to the active setlist
            const activeSetlist = getActiveSetlist();
            activeSetlist.songs = [...activeSetlist.songs, ...newSongs];
            
            saveToLocalStorage();
            renderSetlists(); // Update song count in top card
            updateActiveSetlistView(); // Render new songs in bottom card
            closeAiModal();
            
            // Clear modal inputs for next time
            document.getElementById('ai-theme').value = '';
            document.getElementById('ai-occasion').value = '';
            document.getElementById('ai-notes').value = '';
            songInputsContainer.innerHTML = '';
            songInputCount = 0;

        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            submitAiGenerateBtn.innerHTML = originalBtnText;
            submitAiGenerateBtn.disabled = false;
        }
    });

    // === Local Storage Helpers ===
    function saveToLocalStorage() {
        localStorage.setItem('worshipflow_setlists', JSON.stringify(setlists));
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem('worshipflow_setlists');
        if (saved) {
            setlists = JSON.parse(saved);
            if (setlists.length > 0 && !setlists.find(s => s.id === activeSetlistId)) {
                activeSetlistId = setlists[0].id;
            }
        }
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        if (!newSetlistModalOverlay.classList.contains('hidden')) {
            closeNewSetlistModal();
            return;
        }

        if (!manualSongModalOverlay.classList.contains('hidden')) {
            closeManualSongModal();
            return;
        }

        if (!aiModalOverlay.classList.contains('hidden')) {
            closeAiModal();
        }
    });

    // Run app
    init();
});
