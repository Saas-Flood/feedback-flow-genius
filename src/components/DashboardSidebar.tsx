import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Home,
  Users,
  CheckSquare,
  QrCode,
  MessageSquare,
  Settings,
  BarChart3,
  UserPlus,
  Building
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', icon: Home, id: 'dashboard' },
  { title: 'Teams', icon: Users, id: 'teams' },
  { title: 'Tasks', icon: CheckSquare, id: 'tasks' },
  { title: 'QR Codes', icon: QrCode, id: 'qr-codes' },
  { title: 'Feedback', icon: MessageSquare, id: 'feedback' },
  { title: 'Analytics', icon: BarChart3, id: 'analytics' },
  { title: 'Branches', icon: Building, id: 'branches' },
  { title: 'Settings', icon: Settings, id: 'settings' },
];

interface DashboardSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function DashboardSidebar({ activeSection, onSectionChange }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isActive = (id: string) => activeSection === id;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id)}
                    className={isActive(item.id) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onSectionChange('add-team')}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Add Team</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}