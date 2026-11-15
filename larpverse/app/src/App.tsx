import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ModifyMenu } from './admin/ModifyMenu';
import { AppLayout, ToastHost, useAndroidBack } from './components/Layout';
import { Spinner } from './components/ui';
import { needsServer } from './api';
import { GameScreen } from './game/GameScreen';
import { AuthScreen, ServerSetup } from './screens/Auth';
import { AvatarEditor } from './screens/AvatarEditor';
import { Discover } from './screens/Discover';
import { ExperienceDetail } from './screens/ExperienceDetail';
import { Friends, SocialList } from './screens/Friends';
import { GroupDetail, Groups, NewGroup } from './screens/Groups';
import { Home } from './screens/Home';
import { Inventory } from './screens/Inventory';
import { ItemDetail } from './screens/ItemDetail';
import { Characters, Lobby, SessionHistory } from './screens/Lobby';
import { Marketplace, MarketplaceBrowse } from './screens/Marketplace';
import { More } from './screens/More';
import { Notifications } from './screens/Notifications';
import { Profile } from './screens/Profile';
import { Search } from './screens/Search';
import { Settings } from './screens/Settings';
import { Purchases, Transactions, Wallet } from './screens/Wallet';
import { NotificationWatcher, useSession } from './state';

export function App() {
  const { status, me } = useSession();
  useAndroidBack();
  const theme = me?.settings.preferences.theme ?? 'dark';
  const reduceMotion = Boolean(me?.settings.preferences.reduceMotion);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [theme, reduceMotion]);
  if (needsServer()) return <><ServerSetup /><ToastHost /></>;
  if (status === 'loading' || (status === 'offline' && !me)) {
    return <div className="boot"><Spinner label={status === 'offline' ? 'Can’t reach the server — retrying…' : 'Loading Larpverse…'} />{status === 'offline' && <ServerSetup compact />}</div>;
  }
  if (!me) return <><AuthScreen /><ToastHost /></>;
  return (
    <>
      <NotificationWatcher />
      <Routes>
        <Route path="/session/:id" element={<GameScreen />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/experiences/:id" element={<ExperienceDetail />} />
          <Route path="/play/:experienceId" element={<Lobby />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/game/history" element={<SessionHistory />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/browse" element={<MarketplaceBrowse />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/avatar" element={<AvatarEditor />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/profile/:id/:list" element={<SocialList />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/new" element={<NewGroup />} />
          <Route path="/groups/:id" element={<GroupDetail />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/search" element={<Search />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/wallet/transactions" element={<Transactions />} />
          <Route path="/wallet/purchases" element={<Purchases />} />
          <Route path="/settings/*" element={<Settings />} />
          <Route path="/more" element={<More />} />
          <Route path="/modify/*" element={<ModifyMenu />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ToastHost />
    </>
  );
}
