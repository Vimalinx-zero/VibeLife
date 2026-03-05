import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useMedia } from "../context/MediaContext";
import { useAuth } from "../context/AuthContext";  // ✨ 新增：导入认证上下文

// --- 纯手写 SVG 图标 (保持不变) ---
const Icons = {
  Stopwatch: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>,
  Pause: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>,
  Play: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-3 h-3"}><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>,
  Backward: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" /></svg>,
  Forward: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M5.055 7.06c-1.25-.714-2.805.189-2.805 1.628v8.123c0 1.44 1.555 2.342 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.342 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.346 12 7.25 12 8.688v2.34L5.055 7.06z" /></svg>,
  VolumeHigh: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>,
  VolumeXmark: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" /></svg>,
  Gear: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567l-.091.549a.798.798 0 01-.517.608 7.45 7.45 0 00-.478.198.798.798 0 01-.796-.064l-.453-.324a1.875 1.875 0 00-2.416.2l-.043.044a1.875 1.875 0 00-.205 2.415l.323.452a.798.798 0 01.064.796 7.448 7.448 0 00-.198.478.798.798 0 01-.608.517l-.55.092a1.875 1.875 0 00-1.566 1.849v.06c0 .916.663 1.699 1.567 1.85l.549.091c.281.047.508.25.608.517.06.162.127.321.198.478a.798.798 0 01-.064.796l-.324.453a1.875 1.875 0 00.2 2.416l.044.043a1.875 1.875 0 002.415.205l.452-.323a.798.798 0 01.796-.064c.157.071.316.137.478.198.267.1.47.327.517.608l.092.55c.15.903.932 1.566 1.849 1.566h.06c.916 0 1.699-.663 1.85-1.567l.091-.549a.798.798 0 01.517-.608c.162-.06.321-.127.478-.198a.798.798 0 01.796.064l.453.324a1.875 1.875 0 002.416-.2l.043-.044a1.875 1.875 0 00-2.415-.205l-.452.323a.798.798 0 01-.796.064 7.462 7.462 0 00-.478-.198.798.798 0 01-.608-.517l-.092-.55a1.875 1.875 0 00-1.849-1.566h-.06zM12 15a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
  Palette: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983a1.125 1.125 0 010 1.966h-5.69c-.309 0-.542-.29-.459-.587l1.07-3.745a1.125 1.125 0 012.296 0l1.07 3.745c.083.297-.15.587-.459.587h-.455M12 6a2.25 2.25 0 00-2.25 2.25v.094c0 .534.13.943.233 1.226.167.458.36.815.516 1.103.13.24.242.449.242.683 0 .234-.112.443-.242.683-.156.288-.35.645-.516 1.103-.103.283-.233.692-.233 1.226v.094A2.25 2.25 0 0012 18h.75a2.25 2.25 0 002.25-2.25v-.094c0-.534-.13-.943-.233-1.226-.167-.458-.36-.815-.516-1.103-.13-.24-.242-.449-.242-.683 0-.234.112-.443.242-.683.156-.288.35-.645.516-1.103.103-.283.233-.692.233-1.226V9.75A2.25 2.25 0 0012.75 6H12z" clipRule="evenodd" /></svg>,
  Xmark: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
  Sun: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" /></svg>,
  Moon: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" /></svg>,
};

const TopBar = () => {
  const [show, setShow] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [volume, setVolume] = useState(0.5);

  // ✅ 获取 focusSettings 和用户信息
  const { showSettings, setShowSettings, profile } = useTheme();
  const { user } = useAuth();  // ✨ 新增：获取当前用户

  // ✨ 新增：获取当前头像URL的函数
  const getAvatarUrl = () => {
    // 如果有自定义头像（localStorage中的自定义数据）
    const storedProfile = localStorage.getItem('profile');
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        if (parsed.customAvatar) {
          return parsed.customAvatar;
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    // 否则使用预设头像
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatar || user?.username || 'default'}`;
  };

  // ✅ 使用全局媒体状态
  const {
    isMusicPlaying,
    isMusicMuted,
    tracks,
    currentTrackIndex,
    toggleMusic,
    toggleMusicMute,
    setMusicVolume,
    getCurrentTrack,
    playTrack,
    playNext,
    playPrevious,
    timerStatus,
    timerSeconds,
    toggleTimer,
    stopTimer,
    formatTime
  } = useMedia();

  const currentTrack = getCurrentTrack();

  const isTimerRunning = timerStatus === 'running';

  return (
    <>
    {/* 触发区域：加宽加高，更容易触发 */}
    <div className="fixed top-0 left-0 w-full h-[30px] z-[90] flex justify-center group pointer-events-none">
      <div
        className="w-[80%] h-full pointer-events-auto flex justify-center"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => { setShow(false); }}
      >
        <AnimatePresence>
          {show && !showSettings && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 25 }}
              className="absolute top-0 w-[95%] md:w-[90%] max-w-6xl h-28
                         dark:bg-black/80 bg-white/90 backdrop-blur-2xl
                         border-b border-x dark:border-white/10 border-white/40
                         dark:text-white text-gray-800
                         rounded-b-[3rem] flex items-center justify-between px-12 shadow-2xl z-[91]"
            >
              {/* 1. 番茄钟 Section - 尺寸加大，增加标签 */}
              <div className="flex items-center gap-5">
                <button
                    onClick={() => { if (isTimerRunning) stopTimer(); else toggleTimer(); }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl hover:scale-110 active:scale-95
                    ${isTimerRunning ? 'bg-pink-500 text-white shadow-pink-500/40' : 'dark:bg-white/10 bg-gray-100 text-pink-500 hover:bg-pink-50 dark:hover:bg-white/20'}`}
                >
                   <span className="transform scale-125">{isTimerRunning ? <Icons.Pause /> : <Icons.Stopwatch />}</span>
                </button>
                <div className="flex flex-col cursor-pointer select-none group/timer" onClick={stopTimer}>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-0.5 group-hover/timer:text-pink-500 transition-colors">Focus Timer</span>
                    <div className="font-mono text-4xl font-black tracking-wider dark:text-white text-gray-800 drop-shadow-sm tabular-nums leading-none">
                        {formatTime(timerSeconds)}
                    </div>
                </div>
              </div>

              {/* 2. 音乐 Section - 完整控制 */}
              <div className="flex flex-col items-center gap-1.5 relative">
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isMusicPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                    {currentTrack ? currentTrack.title : 'Lo-Fi Radio'}
                    <button
                      onClick={() => setShowPlaylist(!showPlaylist)}
                      className="text-[9px] opacity-40 hover:opacity-100 transition"
                    >
                      {currentTrackIndex + 1}/{tracks.length}
                    </button>
                 </span>

                 <div className="flex items-center gap-4 px-5 py-2 rounded-2xl dark:bg-white/5 bg-gray-100/80 border border-transparent dark:border-white/5 shadow-inner">
                    {/* 上一首 */}
                    <button
                      onClick={playPrevious}
                      className="opacity-60 hover:opacity-100 hover:scale-110 transition-all active:scale-95"
                      title="上一首"
                    >
                      <Icons.Backward />
                    </button>

                    {/* 播放/暂停 */}
                    <button
                      onClick={toggleMusic}
                      className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-blue-500/40 transition-all active:scale-95"
                    >
                      {isMusicPlaying ? <Icons.Pause /> : <Icons.Play className="ml-0.5 w-4 h-4" />}
                    </button>

                    {/* 下一首 */}
                    <button
                      onClick={playNext}
                      className="opacity-60 hover:opacity-100 hover:scale-110 transition-all active:scale-95"
                      title="下一首"
                    >
                      <Icons.Forward />
                    </button>
                 </div>

                 {/* ✨ 播放列表弹窗 */}
                 <AnimatePresence>
                    {showPlaylist && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 max-h-[320px] overflow-y-auto bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl rounded-xl border border-gray-300 dark:border-white/10 shadow-2xl z-[100] custom-scrollbar"
                      >
                        <div className="p-2">
                          <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 px-2 py-1 border-b border-gray-200 dark:border-white/10 mb-1">
                            播放列表 ({tracks.length})
                          </div>
                          <div className="space-y-0">
                            {tracks.map((track, index) => (
                              <button
                                key={track.id}
                                onClick={() => {
                                  playTrack(index);
                                  setShowPlaylist(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 transition-colors border-b border-gray-200 dark:border-white/5 last:border-0 ${
                                  index === currentTrackIndex
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-300 text-white dark:text-black text-xs flex-shrink-0 flex items-center justify-center">
                                  {track.cover}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <div className="text-xs font-medium truncate">{track.title}</div>
                                  <div className="text-[10px] opacity-60 truncate">{track.artist}</div>
                                </div>
                                {index === currentTrackIndex && isMusicPlaying && (
                                  <div className="flex gap-0.5 items-end h-3">
                                    {[0, 1, 2].map((i) => (
                                      <motion.div
                                        key={i}
                                        className="w-0.5 bg-blue-500 rounded-t"
                                        animate={{
                                          height: [4, 12, 8],
                                        }}
                                        transition={{
                                          duration: 0.8,
                                          repeat: Infinity,
                                          delay: i * 0.2,
                                          ease: "easeInOut"
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              {/* 3. 设置入口 - 整合为工具栏 */}
              <div className="flex items-center gap-3">
                {/* 用户头像 */}
                <button
                  onClick={() => setShowSettings(true)}
                  className="relative group"
                  title="个人资料"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-lg overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500 transition-all">
                    <img
                      src={getAvatarUrl()}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                </button>

                {/* 工具栏 */}
                <div className="flex items-center bg-gray-100/80 dark:bg-white/5 rounded-full px-4 py-2.5 gap-3 border border-transparent dark:border-white/5 shadow-sm">
                  {/* 音量控制 */}
                  <button onClick={toggleMusicMute} className="opacity-60 hover:opacity-100 transition hover:text-blue-500 hover:scale-110">
                    {isMusicMuted ? <Icons.VolumeXmark /> : <Icons.VolumeHigh />}
                  </button>
                  <div className="w-16 relative group">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMusicMuted ? 0 : volume}
                      onChange={(e) => {
                        const newVolume = parseFloat(e.target.value);
                        setVolume(newVolume);
                        setMusicVolume(newVolume);
                      }}
                      className="w-full h-1 bg-gray-300 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500"
                    />
                    {/* 音量填充效果 */}
                    <div
                      className="absolute top-1/2 left-0 h-1 bg-blue-500 rounded-full pointer-events-none transition-all -translate-y-1/2"
                      style={{ width: `${(isMusicMuted ? 0 : volume) * 100}%` }}
                    ></div>
                  </div>
                  <div className="w-px h-4 bg-current opacity-10"></div>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="opacity-60 hover:opacity-100 transition hover:rotate-90 duration-500 hover:text-blue-500 hover:scale-110"
                  >
                    <Icons.Gear />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showSettings && (
             <div className="absolute bottom-2 w-24 h-1 bg-gray-400/30 dark:bg-white/20 backdrop-blur rounded-full transition-all duration-300 group-hover:opacity-0 shadow-sm" />
        )}
      </div>
    </div>
    </>
  );
};

export default TopBar;