import React, { useState, useEffect } from 'react';
import { Menu, Shield, User, ArrowLeft, LogOut } from 'lucide-react';
import { LandingPage } from './components/LandingPage.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { OfficialClearanceModal } from './components/OfficialClearanceModal.tsx';
import { EditProfilePhotoModal } from './components/EditProfilePhotoModal.tsx';

// Admin Views
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminApproval } from './components/admin/AdminApproval.tsx';
import { AdminDocuments } from './components/admin/AdminDocuments.tsx';
import { AdminAnnouncements } from './components/admin/AdminAnnouncements.tsx';
import { AdminMessages } from './components/admin/AdminMessages.tsx';
import { AdminPopulation } from './components/admin/AdminPopulation.tsx';

// Resident Views
import { ResidentDashboard } from './components/resident/ResidentDashboard.tsx';
import { ResidentRequestDoc } from './components/resident/ResidentRequestDoc.tsx';
import { ResidentAnnouncements } from './components/resident/ResidentAnnouncements.tsx';
import { ResidentMessages } from './components/resident/ResidentMessages.tsx';
import { ResidentProfile } from './components/resident/ResidentProfile.tsx';

import {
  Resident,
  DocumentRequestItem,
  AnnouncementItem,
  ResidentMessageItem,
  StatsOverview,
} from './types.ts';
import { BARANGAY_SEAL_IMG, RESIDENT_DEFAULT_IMG, onSealError, onResidentError } from './constants/assets.ts';

export default function App() {
  // Navigation & session state
  const [currentView, setCurrentView] = useState<'landing' | 'portal'>('landing');
  const [currentUser, setCurrentUser] = useState<Resident | null>(null);
  const [role, setRole] = useState<'admin' | 'resident'>('resident');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'split'>('signin');
  const [previewDocument, setPreviewDocument] = useState<DocumentRequestItem | null>(null);
  const [isEditAvatarOpen, setIsEditAvatarOpen] = useState(false);

  // Data states
  const [stats, setStats] = useState<StatsOverview>({
    totalPopulation: 0,
    pendingApprovals: 0,
    pendingDocuments: 0,
    totalDocuments: 0,
    totalMessages: 0,
    registeredVoters: 0,
  });
  const [residents, setResidents] = useState<Resident[]>([]);
  const [documents, setDocuments] = useState<DocumentRequestItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [messages, setMessages] = useState<ResidentMessageItem[]>([]);

  // Load data from Express backend
  const fetchData = async () => {
    try {
      const [statsRes, resRes, docRes, annRes, msgRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/residents'),
        fetch('/api/documents'),
        fetch('/api/announcements'),
        fetch('/api/messages'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (resRes.ok) setResidents(await resRes.json());
      if (docRes.ok) setDocuments(await docRes.json());
      if (annRes.ok) setAnnouncements(await annRes.json());
      if (msgRes.ok) setMessages(await msgRes.json());
    } catch (err) {
      console.warn('API sync warning; using fallback state', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auth handlers
  const handleOpenAuth = (mode: 'signin' | 'register' | 'split' = 'signin') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleLoginSuccess = (user: Resident, userRole: 'admin' | 'resident') => {
    setCurrentUser(user);
    setRole(userRole);
    setCurrentView('portal');
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('landing');
  };

  // Admin Handlers
  const handleApproveResident = async (id: string) => {
    try {
      const res = await fetch(`/api/approvals/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectResident = async (id: string) => {
    try {
      const res = await fetch(`/api/approvals/${id}/reject`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveResident = async (id: string) => {
    try {
      const res = await fetch(`/api/residents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddResident = async (newRes: Partial<Resident>) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRes),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDocStatus = async (
    id: string,
    status: DocumentRequestItem['status']
  ) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveToggle = async (id: string, isArchived: boolean) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAnnouncement = async (data: {
    title: string;
    subtitle?: string;
    description: string;
    eventTime?: string;
  }) => {
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (id: string, content: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: currentUser?.fullName || (role === 'admin' ? 'Barangay Admin' : 'Resident'),
          authorAvatar:
            role === 'admin'
              ? '/barangay_seal_logo.jpg'
              : currentUser?.avatarUrl || '/filipino_male_resident_1792164529391.jpg',
          content,
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplyMessage = async (id: string, replyText: string) => {
    try {
      const res = await fetch(`/api/messages/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'Barangay Admin',
          message: replyText,
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resident actions
  const handleSubmitDocumentRequest = async (
    types: string[],
    purpose: string,
    address: string
  ) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: currentUser?.id || 'res-1',
          fullName: currentUser?.fullName || 'John Rhonel Celin',
          contactNo: currentUser?.contactNo || '09704875728',
          address,
          documentTypes: types,
          purpose,
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendResidentMessage = async (data: { message: string; category: string }) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: currentUser?.id || 'res-1',
          residentName: currentUser?.fullName || 'John Rhonel Celin',
          contactNo: currentUser?.contactNo || '09704875728',
          message: data.message,
          category: data.category,
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (updated: Partial<Resident>) => {
    if (currentUser) {
      const merged = { ...currentUser, ...updated };
      setCurrentUser(merged);
      try {
        const res = await fetch(`/api/residents/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.resident) {
            setCurrentUser(data.resident);
            setResidents((prev) =>
              prev.map((r) => (r.id === data.resident.id ? data.resident : r))
            );
          }
        }
      } catch (err) {
        console.warn('Failed to sync updated profile to server', err);
      }
    }
  };

  // Landing page quick service click
  const handleLandingServiceClick = (service: 'document' | 'report' | 'announcements') => {
    if (!currentUser) {
      handleOpenAuth('signin');
      return;
    }
    setCurrentView('portal');
    if (service === 'document') setActiveTab('documents');
    if (service === 'report') setActiveTab('messages');
    if (service === 'announcements') setActiveTab('announcements');
  };

  // Current resident filtered data
  const myDocs = currentUser
    ? documents.filter((d) => d.residentId === currentUser.id || role === 'admin')
    : documents;
  const myMsgs = currentUser
    ? messages.filter((m) => m.residentId === currentUser.id || role === 'admin')
    : messages;

  return (
    <div className="min-h-screen bg-[#0084ff] flex flex-col font-sans">
      {/* 1. PUBLIC LANDING VIEW */}
      {currentView === 'landing' ? (
        <LandingPage
          onOpenAuth={handleOpenAuth}
          onSelectService={handleLandingServiceClick}
          onEnterPortal={() => {
            if (currentUser) {
              setCurrentView('portal');
            } else {
              handleOpenAuth('signin');
            }
          }}
          stats={stats}
        />
      ) : (
        /* 2. PORTAL VIEW (Admin or Resident) */
        <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden">
          {/* Shared Responsive Sidebar */}
          <Sidebar
            role={role}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            onLogout={handleLogout}
            currentUser={currentUser}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onGoToLanding={() => setCurrentView('landing')}
            onOpenEditAvatar={() => setIsEditAvatarOpen(true)}
          />

          {/* Main Content Pane */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0084ff]">
            {/* Top Bar with Responsive Hamburger, Barangay Logo & Role Switcher */}
            <header className="bg-[#0084ff] px-4 sm:px-6 py-3 flex items-center justify-between border-b border-blue-400/40 text-white shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg bg-blue-700/60 hover:bg-blue-700 text-white cursor-pointer"
                  title="Open Navigation"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Barangay Logo & Title in Portal Header */}
                <button
                  onClick={() => setCurrentView('landing')}
                  className="flex items-center gap-2.5 text-left group cursor-pointer hover:opacity-95 transition-opacity"
                  title="Pumunta sa Public Portal"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-white/90 shadow-xs shrink-0 bg-white">
                    <img
                      src={BARANGAY_SEAL_IMG}
                      onError={onSealError}
                      alt="Barangay Seal"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm sm:text-base hidden sm:inline">
                      Barangay San Juan Management System
                    </span>
                    <span className="font-mono font-bold text-sm sm:hidden">
                      Brgy. San Juan
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/20 font-bold">
                      {role === 'admin' ? 'Admin Mode' : 'Resident Mode'}
                    </span>
                  </div>
                </button>
              </div>

              {/* User Avatar Edit & Public Page Link */}
              <div className="flex items-center gap-3">
                {currentUser && (
                  <button
                    onClick={() => setIsEditAvatarOpen(true)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer border border-white/20 text-xs font-mono font-bold"
                    title="I-click para palitan ang iyong profile picture"
                  >
                    <img
                      src={currentUser.avatarUrl || RESIDENT_DEFAULT_IMG}
                      onError={onResidentError}
                      alt={currentUser.fullName}
                      className="w-5 h-5 rounded-full object-cover border border-white"
                    />
                    <span className="hidden md:inline truncate max-w-[160px]">
                      {currentUser.role === 'admin' ? 'Hon. Harold Villaroman' : (currentUser.firstName || currentUser.fullName)}
                    </span>
                    <span className="text-[10px] text-[#d7e635] underline font-bold">Edit</span>
                  </button>
                )}

                <button
                  onClick={() => setCurrentView('landing')}
                  className="hidden sm:flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded-lg bg-blue-700/60 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Public Page</span>
                </button>
              </div>
            </header>

            {/* Scrollable Page Body */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="max-w-6xl mx-auto">
                {/* ADMIN ROUTES */}
                {role === 'admin' && (
                  <>
                    {activeTab === 'dashboard' && (
                      <AdminDashboard
                        stats={stats}
                        recentDocuments={documents}
                        recentMessages={messages}
                        onNavigate={(tab) => setActiveTab(tab)}
                      />
                    )}
                    {activeTab === 'approval' && (
                      <AdminApproval
                        residents={residents}
                        onApprove={handleApproveResident}
                        onReject={handleRejectResident}
                      />
                    )}
                    {activeTab === 'documents' && (
                      <AdminDocuments
                        documents={documents}
                        onUpdateStatus={handleUpdateDocStatus}
                        onArchiveToggle={handleArchiveToggle}
                        onPreviewClearance={(doc) => setPreviewDocument(doc)}
                      />
                    )}
                    {activeTab === 'announcements' && (
                      <AdminAnnouncements
                        announcements={announcements}
                        onCreateAnnouncement={handleCreateAnnouncement}
                        onDeleteAnnouncement={handleDeleteAnnouncement}
                        onAddComment={handleAddComment}
                      />
                    )}
                    {activeTab === 'messages' && (
                      <AdminMessages
                        messages={messages}
                        onReplyMessage={handleReplyMessage}
                        onDeleteMessage={handleDeleteMessage}
                      />
                    )}
                    {activeTab === 'population' && (
                      <AdminPopulation
                        residents={residents}
                        isVotersMode={false}
                        onRemoveResident={handleRemoveResident}
                        onAddResident={handleAddResident}
                      />
                    )}
                    {activeTab === 'voters' && (
                      <AdminPopulation
                        residents={residents}
                        isVotersMode={true}
                        onRemoveResident={handleRemoveResident}
                        onAddResident={handleAddResident}
                      />
                    )}
                  </>
                )}

                {/* RESIDENT ROUTES */}
                {role === 'resident' && currentUser && (
                  <>
                    {activeTab === 'dashboard' && (
                      <ResidentDashboard
                        resident={currentUser}
                        myDocuments={myDocs}
                        announcements={announcements}
                        myMessages={myMsgs}
                        onNavigate={(tab) => setActiveTab(tab)}
                        onOpenEditAvatar={() => setIsEditAvatarOpen(true)}
                      />
                    )}
                    {activeTab === 'documents' && (
                      <ResidentRequestDoc
                        resident={currentUser}
                        myDocuments={myDocs}
                        onSubmitRequest={handleSubmitDocumentRequest}
                        onPreviewClearance={(doc) => setPreviewDocument(doc)}
                      />
                    )}
                    {activeTab === 'announcements' && (
                      <ResidentAnnouncements
                        resident={currentUser}
                        announcements={announcements}
                        onAddComment={handleAddComment}
                      />
                    )}
                    {activeTab === 'messages' && (
                      <ResidentMessages
                        resident={currentUser}
                        myMessages={myMsgs}
                        onSendMessage={handleSendResidentMessage}
                      />
                    )}
                    {activeTab === 'profile' && (
                      <ResidentProfile
                        resident={currentUser}
                        onUpdateProfile={handleUpdateProfile}
                      />
                    )}
                  </>
                )}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* Global Auth Modal (Sign in / Register / Submitted / Split view) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegistered={fetchData}
        initialMode={authMode}
      />

      {/* Official Certificate Preview & Print Modal */}
      <OfficialClearanceModal
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
      />

      {/* Edit Profile Picture Modal */}
      {currentUser && (
        <EditProfilePhotoModal
          isOpen={isEditAvatarOpen}
          onClose={() => setIsEditAvatarOpen(false)}
          currentAvatar={currentUser.avatarUrl || RESIDENT_DEFAULT_IMG}
          userName={currentUser.fullName}
          onSaveAvatar={async (newAvatarUrl) => {
            await handleUpdateProfile({ avatarUrl: newAvatarUrl });
          }}
        />
      )}
    </div>
  );
}
