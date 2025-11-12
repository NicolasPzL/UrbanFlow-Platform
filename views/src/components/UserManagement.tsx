import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { normalizeRolToEs, mapUiArrayToBackend } from "../lib/roles";
import { Search, Plus, Edit, Trash2, Users } from "lucide-react";

// Defino un tipo más estricto para las propiedades de edición (para corregir el error de setNewUser)
type UserRole = "admin" | "operador" | "analista" | "cliente";
type UserStatus = "active" | "inactive" | "deleted";

type UIUser = {
  id: string;
  name: string;
  email: string;
  rol: UserRole | string; // Se mantiene flexible para datos de API
  status: UserStatus | string; // Se mantiene flexible para datos de API
  lastLogin?: string;
};

// **CORRECCIÓN 1: Definición de tipo para NewUser/EditingUser**
// Usamos los tipos más amplios (UserRole, UserStatus) en lugar de literales 'as const' para que
// handleEditUser pueda asignar un usuario existente sin error de tipado.
type NewUserForm = {
  name: string;
  email: string;
  rol: UserRole | string;
  status: UserStatus | string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "operador", label: "Operador" },
  { value: "analista", label: "Analista" },
  { value: "admin", label: "Administrador" },
  { value: "cliente", label: "Cliente" },
];
const STAFF_ROLE_SET = new Set<UserRole>(["admin", "operador", "analista"]);

function rolesAreValid(roles: UserRole[]): boolean {
  if (!roles.length) return false;
  const hasClient = roles.includes("cliente");
  const hasStaff = roles.some((role) => STAFF_ROLE_SET.has(role));
  return !(hasClient && hasStaff);
}

function toggleRoleSelection(current: UserRole[], role: UserRole, checked: boolean): UserRole[] {
  let next: UserRole[] = current;
  if (checked) {
    if (role === "cliente") {
      next = ["cliente"];
    } else {
      next = current.filter((r) => r !== role && r !== "cliente");
      next = [...next, role];
    }
  } else {
    next = current.filter((r) => r !== role);
  }
  return Array.from(new Set(next)) as UserRole[];
}
export function UserManagement() {
  const [users, setUsers] = useState<UIUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UIUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<NewUserForm>({ // Usamos el nuevo tipo
    name: "",
    email: "",
    rol: "operador",
    status: "active"
  });
  // Multi-rol: creación
  const [newUserRoles, setNewUserRoles] = useState<UserRole[]>(["operador"]);
  // Multi-rol: edición
  const [editUserRoles, setEditUserRoles] = useState<UserRole[]>([]);
  // Contraseña temporal generada
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [showPasswordBanner, setShowPasswordBanner] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLiveMessage, setCreateLiveMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<UIUser | null>(null);
  const [createAttempted, setCreateAttempted] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const trimmedName = newUser.name.trim();
  const trimmedEmail = newUser.email.trim();
  const nameValid = trimmedName.length > 0;
  const emailValid = trimmedEmail.length > 0 && EMAIL_PATTERN.test(trimmedEmail);
  const rolesValid = rolesAreValid(newUserRoles);
  const createDisabled = !nameValid || !emailValid || !rolesValid || isSubmitting;
  const emailError =
    newUser.email.length > 0 && !emailValid
      ? "El correo debe contener '@' y tener un formato válido"
      : null;
  const roleError = !newUserRoles.length
    ? "Selecciona al menos un rol"
    : rolesValid
    ? null
    : "El rol 'cliente' no puede combinarse con admin, analista u operador";
  const showRoleError = roleError !== null && (createAttempted || !rolesValid || newUserRoles.includes("cliente"));
  const showNameError = createAttempted && !nameValid;
  const editRolesValid = rolesAreValid(editUserRoles);
  const editRoleError = !editUserRoles.length
    ? "Selecciona al menos un rol"
    : editRolesValid
    ? null
    : "El rol 'cliente' no puede combinarse con admin, analista u operador";
  // Cargar usuarios desde backend (requiere admin)
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/users?includeDeleted=true', { credentials: 'include' });
        if (!resp.ok) throw new Error('No se pudo cargar usuarios');

        const json = await resp.json();
        const items = Array.isArray(json.data) ? json.data : [];

        const mapped: UIUser[] = items.map((u: any) => {
          const isDeleted = Boolean(u.deleted_at);
          const status: UserStatus = isDeleted
            ? "deleted"
            : u.is_active === false ||
              u.isActive === false ||
              u.status === "inactive"
            ? "inactive"
            : "active";
          return {
            id: String(u.usuario_id ?? u.id ?? ""),
            name: u.nombre ?? u.name ?? "",
            email: (u.correo ?? u.email ?? "").toLowerCase(),
            rol: normalizeRolToEs(u),
            status,
            lastLogin: u.last_login ?? u.lastLogin ?? undefined,
          };
        });

        setUsers(mapped);
      } catch (e: any) {
        console.error('Error cargando usuarios:', e);
        setError(e?.message || 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (createError) {
      setCreateLiveMessage(createError);
      return;
    }
    if (!nameValid || !emailValid || !rolesValid) {
      const messages: string[] = [];
      if (!nameValid) messages.push("El nombre es obligatorio");
      if (!emailValid) messages.push("El correo debe contener '@' y tener un formato válido");
      if (!rolesValid) messages.push("Revisa la selección de roles");
      setCreateLiveMessage(messages.join(". "));
    } else {
      setCreateLiveMessage("");
    }
  }, [createError, nameValid, emailValid, rolesValid]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      setCreateError(null);
      setCreateAttempted(false);
      setIsSubmitting(false);
      setCreateLiveMessage("");
    }
  }, [isCreateModalOpen]);

  const handleCreateUser = async () => {
    setCreateAttempted(true);
    setCreateError(null);
    setFeedbackBanner(null);

    if (!nameValid || !emailValid || !rolesValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nombre: trimmedName,
          correo: trimmedEmail.toLowerCase(),
          rol: newUserRoles[0] ?? newUser.rol,
          roles: mapUiArrayToBackend(newUserRoles),
        }),
      });

      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const message =
          resp.status === 409
            ? "Ya existe un usuario con ese correo"
            : resp.status === 422
            ? payload?.error?.message ?? "Datos inválidos"
            : "Error interno al crear usuario";
        console.warn("[UI][USER_CREATE]", { status: resp.status, payload });
        setCreateError(message);
        setFeedbackBanner({ type: "error", message });
        return;
      }

      const u = payload?.data ?? {};
      const isDeleted = Boolean(u.deleted_at);
      const mapped: UIUser = {
        id: String(u.usuario_id ?? u.id ?? ""),
        name: u.nombre ?? u.name ?? trimmedName,
        email: (u.correo ?? u.email ?? trimmedEmail).toLowerCase(),
        rol: normalizeRolToEs(u),
        status: isDeleted
          ? "deleted"
          : u.is_active === false ||
            u.isActive === false ||
            u.status === "inactive"
          ? "inactive"
          : "active",
        lastLogin: u.last_login ?? u.lastLogin ?? undefined,
      };

      setUsers((prev) => [...prev, mapped]);
      setCreateAttempted(false);
      setCreateError(null);
      setFeedbackBanner({ type: "success", message: "Usuario creado correctamente" });

      if (u.temporaryPassword) {
        setTemporaryPassword(u.temporaryPassword);
        setShowPasswordBanner(true);
        setNewUser({ name: "", email: "", rol: "operador", status: "active" });
        setNewUserRoles(["operador"]);
      } else {
        setNewUser({ name: "", email: "", rol: "operador", status: "active" });
        setNewUserRoles(["operador"]);
        setIsCreateModalOpen(false);
      }
    } catch (e) {
      console.error("[UI][USER_CREATE]", e);
      const message = "Error al crear usuario";
      setCreateError(message);
      setFeedbackBanner({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtro por nombre o correo
  const filteredUsers = users.filter((user) =>
    (user.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // **CORRECCIÓN 4 y 5: handleEditUser para asignar tipos flexibles**
  // Se ha corregido el error de tipado de rol y status quitando el 'as any' 
  // de la línea 32 y usando el tipo NewUserForm.
  const handleEditUser = async (user: UIUser) => {
    setFeedbackBanner(null);
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      rol: user.rol,
      status: user.status
    });
    try {
      const r = await fetch(`/api/users/${user.id}`, { credentials: 'include' });
      if (r.ok) {
        const j = await r.json();
        const rolesArr: string[] = Array.isArray(j?.data?.roles) ? j.data.roles : [];
        const normalized = rolesArr.map(x => normalizeRolToEs(x));
        const uniq = Array.from(new Set(normalized)) as UserRole[];
        setEditUserRoles(uniq.length ? uniq : [normalizeRolToEs(user.rol)]);
      } else {
        setEditUserRoles([normalizeRolToEs(user.rol)]);
      }
    } catch {
      setEditUserRoles([normalizeRolToEs(user.rol)]);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    const updateName = newUser.name.trim();
    const updateEmail = newUser.email.trim().toLowerCase();
    if (!rolesAreValid(editUserRoles)) {
      setFeedbackBanner({ type: "error", message: editRoleError ?? "Roles inválidos" });
      return;
    }
    setFeedbackBanner(null);
    try {
      const resp = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nombre: updateName,
          correo: updateEmail,
          rol: editUserRoles[0] ?? newUser.rol,
          roles: mapUiArrayToBackend(editUserRoles),
          is_active: newUser.status === 'active'
        }),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const message = payload?.error?.message ?? 'No se pudo actualizar';
        console.warn('[UI][USER_UPDATE]', { status: resp.status, payload });
        setFeedbackBanner({ type: 'error', message });
        return;
      }
      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                name: updateName,
                email: updateEmail,
                rol: editUserRoles[0] ?? newUser.rol,
                status: newUser.status as UserStatus,
              }
            : user
        )
      );
      setFeedbackBanner({ type: 'success', message: 'Usuario actualizado' });
      setEditingUser(null);
      setNewUser({ name: "", email: "", rol: "operador", status: "active" });
      setEditUserRoles([]);
    } catch (e) {
      console.error('[UI][USER_UPDATE]', e);
      setFeedbackBanner({ type: 'error', message: 'Error actualizando usuario' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setFeedbackBanner(null);
    try {
      const resp = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const message = payload?.error?.message ?? 'No se pudo eliminar';
        console.error('[UI][USER_DELETE]', { status: resp.status, payload });
        setFeedbackBanner({ type: 'error', message });
        return;
      }
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, status: 'deleted' }
            : user
        )
      );
      setFeedbackBanner({ type: 'success', message: 'Usuario eliminado' });
    } catch (e) {
      console.error('[UI][USER_DELETE]', e);
      setFeedbackBanner({ type: 'error', message: 'Error eliminando usuario' });
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    setFeedbackBanner(null);
    try {
      const resp = await fetch(`/api/admin/users/${restoreTarget.id}/restore`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const message = payload?.error?.message ?? 'No se pudo restablecer el usuario';
        console.error('[UI][USER_RESTORE]', { status: resp.status, payload });
        setFeedbackBanner({ type: 'error', message });
        return;
      }
      const restored = payload?.data ?? {};
      setUsers((prev) =>
        prev.map((user) =>
          user.id === restoreTarget.id
            ? {
                ...user,
                status: 'active',
                name: restored.nombre ?? user.name,
                email: (restored.correo ?? user.email).toLowerCase(),
                rol: normalizeRolToEs(restored ?? user),
              }
            : user
        )
      );
      setFeedbackBanner({ type: 'success', message: 'Usuario restablecido' });
    } catch (e) {
      console.error('[UI][USER_RESTORE]', e);
      setFeedbackBanner({ type: 'error', message: 'Error restableciendo usuario' });
    } finally {
      setRestoreLoading(false);
      setRestoreTarget(null);
    }
  };

  const getrolBadgeVariant = (rol: string) => {
    switch (rol) {
      case 'admin': return 'default';
      case 'operador': return 'secondary';
      case 'analista': return 'outline';
      case 'cliente': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'active') return 'default';
    if (status === 'deleted') return 'destructive';
    return 'secondary';
  };

  const rolLabels: Record<string, string> = {
    admin: 'Administrador',
    operador: 'Operador',
    analista: 'Analista',
    cliente: 'cliente'
  };

  const statusLabels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    deleted: 'Eliminado',
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-2">
              Administra usuarios del sistema Urban Flow
            </p>
          </div>
          <div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="mt-4 lg:mt-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                </DialogHeader>
                <div aria-live="polite" className="sr-only">
                  {createLiveMessage}
                </div>
                {!showPasswordBanner && createError && (
                  <Alert variant="destructive" className="mb-4" role="alert">
                    <AlertTitle>Error al crear usuario</AlertTitle>
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
                )}
                {showPasswordBanner && temporaryPassword ? (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-lg font-bold text-yellow-900 mb-3">
                            ✅ Usuario Creado Exitosamente
                          </h3>
                          <div className="mt-2 text-sm text-yellow-800">
                            <p className="mb-3 font-semibold">La contraseña temporal para este usuario es:</p>
                            <div className="bg-yellow-100 border-2 border-yellow-300 p-4 rounded font-mono text-xl font-bold break-all text-center tracking-wider">
                              {temporaryPassword}
                            </div>
                            <div className="mt-4 space-y-2">
                              <p className="font-semibold text-yellow-900">⚠️ IMPORTANTE:</p>
                              <ul className="list-disc list-inside space-y-1 text-yellow-800">
                                <li>Guarda esta contraseña de forma segura</li>
                                <li>No se mostrará nuevamente</li>
                                <li>Comunícasela al usuario de forma segura</li>
                                <li>El usuario deberá cambiarla en su primer inicio de sesión</li>
                              </ul>
                            </div>
                          </div>
                          <div className="mt-4">
                            <Button
                              className="w-full"
                              onClick={() => {
                                setShowPasswordBanner(false);
                                setTemporaryPassword(null);
                                setIsCreateModalOpen(false);
                              }}
                            >
                              Cerrar y Continuar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input
                          id="name"
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          placeholder="Ej. Juan Pérez"
                          aria-invalid={showNameError}
                        />
                        {showNameError && (
                          <p className="text-sm text-red-600 mt-1" role="alert" aria-live="polite">
                            El nombre es obligatorio
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          placeholder="juan.perez@urbanflow.com"
                          aria-invalid={Boolean(emailError)}
                          aria-describedby="create-email-error"
                        />
                        {emailError && (
                          <p
                            id="create-email-error"
                            className="text-sm text-red-600 mt-1"
                            role="alert"
                            aria-live="polite"
                          >
                            {emailError}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Roles</Label>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                          {ROLE_OPTIONS.map(({ value, label }) => (
                            <label key={value} className="flex items-center space-x-2">
                              <Checkbox
                                checked={newUserRoles.includes(value)}
                                onCheckedChange={(checked: boolean | "indeterminate") => {
                                  const next = toggleRoleSelection(newUserRoles, value, Boolean(checked));
                                  setNewUserRoles(next);
                                  setNewUser((prev) => ({ ...prev, rol: next[0] ?? prev.rol }));
                                }}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          El primer rol marcado será el rol primario del usuario.
                        </p>
                        {showRoleError && (
                          <p className="text-sm text-red-600 mt-2" role="alert" aria-live="polite">
                            {roleError}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="status">Estado</Label>
                        <Select value={newUser.status} onValueChange={(value: UserStatus | string) => setNewUser({ ...newUser, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Nota:</strong> Se generará automáticamente una contraseña temporal segura para el usuario. 
                          Se mostrará una sola vez después de crear el usuario.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setIsCreateModalOpen(false);
                        setShowPasswordBanner(false);
                        setTemporaryPassword(null);
                      }}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateUser} disabled={createDisabled}>
                        {isSubmitting ? "Creando..." : "Crear Usuario"}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {feedbackBanner && (
          <Alert
            variant={feedbackBanner.type === "error" ? "destructive" : "default"}
            role="alert"
            className="mb-6"
          >
            <AlertTitle>{feedbackBanner.type === "error" ? "Error" : "Acción completada"}</AlertTitle>
            <AlertDescription>{feedbackBanner.message}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.rol === 'admin' && u.status !== 'deleted').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operadores</CardTitle>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.rol === 'operador' && u.status !== 'deleted').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analistas</CardTitle>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.rol === 'analista' && u.status !== 'deleted').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle>Lista de Usuarios</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="text-sm text-gray-500">Cargando usuarios...</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getrolBadgeVariant(user.rol)}>
                        {rolLabels[user.rol as keyof typeof rolLabels] || user.rol}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {statusLabels[user.status as keyof typeof statusLabels] || user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin || 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {user.status === "deleted" ? (
                          <Button size="sm" onClick={() => setRestoreTarget(user)}>
                            Restablecer
                          </Button>
                        ) : (
                          <>
                            <Dialog open={editingUser?.id === user.id} onOpenChange={(open: boolean) => !open && setEditingUser(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Editar Usuario</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="edit-name">Nombre Completo</Label>
                                    <Input
                                      id="edit-name"
                                      value={newUser.name}
                                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-email">Correo Electrónico</Label>
                                    <Input
                                      id="edit-email"
                                      type="email"
                                      value={newUser.email}
                                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Roles</Label>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {ROLE_OPTIONS.map(({ value, label }) => (
                                        <label key={value} className="flex items-center space-x-2">
                                          <Checkbox
                                            checked={editUserRoles.includes(value)}
                                            onCheckedChange={(checked: boolean | "indeterminate") => {
                                              const next = toggleRoleSelection(editUserRoles, value, Boolean(checked));
                                              setEditUserRoles(next);
                                              setNewUser((prev) => ({ ...prev, rol: next[0] ?? prev.rol }));
                                            }}
                                          />
                                          <span>{label}</span>
                                        </label>
                                      ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">El primer rol marcado será el rol primario del usuario.</p>
                                    {editingUser && editRoleError && (
                                      <p className="text-sm text-red-600 mt-2" role="alert" aria-live="polite">
                                        {editRoleError}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-status">Estado</Label>
                                    <Select value={newUser.status} onValueChange={(value: UserStatus | string) => setNewUser({ ...newUser, status: value })}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">Activo</SelectItem>
                                        <SelectItem value="inactive">Inactivo</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingUser(null)}>
                                    Cancelar
                                  </Button>
                                  <Button onClick={handleUpdateUser}>
                                    Guardar Cambios
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
    <AlertDialog
      open={Boolean(restoreTarget)}
      onOpenChange={(open) => {
        if (!open && !restoreLoading) {
          setRestoreTarget(null);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restablecer usuario</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Restablecer usuario {restoreTarget?.email}? Esto reactivará su acceso.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={restoreLoading} onClick={() => !restoreLoading && setRestoreTarget(null)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmRestore} disabled={restoreLoading}>
            {restoreLoading ? "Restaurando..." : "Restablecer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}