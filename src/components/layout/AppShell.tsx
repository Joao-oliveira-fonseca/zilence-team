import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  CalendarRange,
  Eye,
  LayoutDashboard,
  LogOut,
  Microscope,
  Settings,
  Shield,
  TrendingUp,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions, type AppRole } from "@/lib/member";
import { teamSettingsQueryOptions } from "@/lib/queries";
import { isLanguage, useI18n, LANGUAGES, type TranslationKey } from "@/i18n";
import { useChangeLanguage } from "@/components/common/LanguageSwitch";
import { LogoLockup, LogoMark } from "@/components/common/Logo";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: TranslationKey; icon: typeof LayoutDashboard };

const coachNav: NavItem[] = [
  { to: "/overview", label: "nav.overview", icon: LayoutDashboard },
  { to: "/players", label: "nav.players", icon: Users },
  { to: "/operations", label: "nav.operations", icon: CalendarRange },
  { to: "/analysis", label: "nav.analysis", icon: Microscope },
  { to: "/visibility", label: "nav.visibility", icon: Eye },
  { to: "/team", label: "nav.team", icon: Shield },
  { to: "/settings", label: "nav.settings", icon: Settings },
];

const playerNav: NavItem[] = [
  { to: "/dashboard", label: "nav.myDashboard", icon: LayoutDashboard },
  { to: "/performance", label: "nav.myPerformance", icon: TrendingUp },
  { to: "/hub", label: "nav.teamHub", icon: UsersRound },
  { to: "/profile", label: "nav.myProfile", icon: User },
];

function navFor(role: AppRole | null) {
  if (role === "coach") return coachNav;
  if (role === "player") return playerNav;
  return [];
}

function AppSidebar({ role }: { role: AppRole | null }) {
  const { t } = useI18n();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = navFor(role);
  const { data: team } = useQuery({ ...teamSettingsQueryOptions, enabled: role !== null });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        {collapsed ? <LogoMark className="mx-auto size-8" src={team?.logo_url ?? null} alt={team?.name ?? "ZILENCE"} /> : <LogoLockup name={team?.name ?? "ZILENCE"} slogan={team?.slogan ?? "BUILT TO COMPETE."} logoUrl={team?.logo_url ?? null} />}
      </SidebarHeader>
      <SidebarContent>
        {items.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="eyebrow">
              {role === "coach" ? t("nav.coachArea") : t("nav.playerArea")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={t(item.label)}>
                        <Link
                          to={item.to}
                          onClick={() => setOpenMobile(false)}
                          className={cn(
                            "relative font-medium",
                            active && "text-primary before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-primary",
                          )}
                        >
                          <item.icon />
                          <span>{t(item.label)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4">
        {!collapsed && (
          <p className="font-display text-[10px] font-semibold tracking-[0.3em] text-muted-foreground">{team?.slogan ?? "BUILT TO COMPETE."}</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function initials(name: string | null | undefined) {
  return (name ?? "?").slice(0, 2).toUpperCase();
}

export function AppShell() {
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const { t, lang, setLang } = useI18n();
  const changeLanguage = useChangeLanguage(member?.userId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const synced = useRef(false);

  // Apply the language saved on the account once per session.
  useEffect(() => {
    const saved = member?.profile?.language;
    if (!synced.current && isLanguage(saved)) {
      synced.current = true;
      if (saved !== lang) setLang(saved);
    }
  }, [member?.profile?.language, lang, setLang]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const name = member?.player?.nickname ?? member?.profile?.display_name ?? member?.email ?? "";
  const avatar = member?.player?.avatar_url ?? member?.profile?.avatar_url ?? undefined;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar role={member?.role ?? null} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-5">
            <SidebarTrigger />
            <div className="flex-1" />
            <NotificationCenter />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
                  <Avatar className="size-8 ring-1 ring-border">
                    {avatar && <AvatarImage src={avatar} alt={name} />}
                    <AvatarFallback className="bg-surface font-display text-xs">{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left leading-tight sm:block">
                    <div className="max-w-40 truncate text-sm font-medium">{name}</div>
                    {member?.role && <div className="eyebrow text-[10px] text-primary">{t(`role.${member.role}`)}</div>}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{member?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="eyebrow">{t("common.language")}</DropdownMenuLabel>
                {LANGUAGES.map((code) => (
                  <DropdownMenuItem key={code} onClick={() => changeLanguage(code)} className={cn(lang === code && "text-primary")}>
                    {t(`lang.${code}`)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut />
                  {t("common.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
