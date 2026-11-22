import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setDesktopSidebarOpen((prev) => !prev);
    } else {
      setMobileSidebarOpen((prev) => !prev);
    }
  };

  const handleCloseSidebar = () => {
    setMobileSidebarOpen(false);
    setDesktopSidebarOpen(false);
  };

  return (
    <div className="min-h-screen omni-grid-bg text-[#F4F6FB] flex flex-col dark-theme">
      {/* Full-width Top GlobalHeader (70px height) */}
      <Header
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={desktopSidebarOpen}
      />

      {/* AppSidebar & Main Content Shell */}
      <div className="flex-1 flex pt-[70px] relative">
        <Sidebar
          isOpen={mobileSidebarOpen}
          isDesktopOpen={desktopSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          onToggleDesktop={() => setDesktopSidebarOpen((prev) => !prev)}
          onCollapseAll={handleCloseSidebar}
        />

        <main
          className={`flex-1 min-w-0 p-4 md:p-6 xl:p-[30px] w-full mx-auto transition-all duration-300 ${
            desktopSidebarOpen
              ? 'lg:pl-[272px] xl:pl-[308px] max-w-[1600px]'
              : 'lg:pl-12 max-w-full'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
