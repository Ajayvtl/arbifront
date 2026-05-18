import {
    LayoutDashboard, FlaskConical, ShoppingCart, FileText, Users,
    Settings, LogOut, Activity, MapPin, Tag, Image as ImageIcon,
    Shield, Smartphone, Building2, BarChart3, Calculator, ShoppingBag, CreditCard, Wallet, GitBranch,
    MessageSquare, UserCircle, Bell, ArrowLeftRight
} from "lucide-react";
import { UserGroupIcon, GlobeAltIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import type { ComponentType } from "react";

export const IconMap: Record<string, ComponentType<Record<string, unknown>>> = {
    "LayoutDashboard": LayoutDashboard,
    "FlaskConical": FlaskConical,
    "ShoppingCart": ShoppingCart,
    "FileText": FileText,
    "Users": Users,
    "Settings": Settings,
    "LogOut": LogOut,
    "Activity": Activity,
    "MapPin": MapPin,
    "Tag": Tag,
    "ImageIcon": ImageIcon,
    "Shield": Shield,
    "Smartphone": Smartphone,
    "BuildingOffice2Icon": Building2,
    "BarChart3": BarChart3,
    "Calculator": Calculator,
    "CreditCard": CreditCard,
    "Wallet": Wallet,
    "ShoppingBag": ShoppingBag,
    "MessageSquare": MessageSquare,
    "UserCircle": UserCircle,
    "Bell": Bell,
    "GitBranch": GitBranch,
    "UserGroupIcon": UserGroupIcon,
    "GlobeAltIcon": GlobeAltIcon,
    "CircleStackIcon": CircleStackIcon,
    "ArrowLeftRight": ArrowLeftRight
};
