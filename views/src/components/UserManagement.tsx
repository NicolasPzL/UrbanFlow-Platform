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
import { normalizeRolToEs, mapUiArrayToBackend } from "../lib/roles";
import { Search, Plus, Edit, Trash2, Users } from "lucide-react";

// Defino un tipo más estricto para las propiedades de edición (para corregir el error de setNewUser)
type UserRole = "admin" | "operador" | "analista" | "cliente";
type UserStatus = "active" | "inactive";

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

  // Cargar usuarios desde backend (requiere admin)
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/users', { credentials: 'include' });
        if (!resp.ok) throw new Error('No se pudo cargar usuarios');

        const json = await resp.json();
        const items = Array.isArray(json.data) ? json.data : [];

        const mapped: UIUser[] = items.map((u: any) => ({
          id: String(u.usuario_id ?? u.id ?? ''),
          name: u.nombre ?? u.name ?? '',
          email: u.correo ?? u.email ?? '',
          rol: normalizeRolToEs(u),
          status:
            u.is_active === false ||
            u.isActive === false ||
            u.status === 'inactive'
              ? 'inactive'
              : 'active',
          lastLogin: u.last_login ?? u.lastLogin ?? undefined,
        }));

        setUsers(mapped);
      } catch (e: any) {
        console.error('Error cargando usuarios:', e);
        setError(e?.message || 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreateUser = async () => {
    try {
      const resp = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nombre: newUser.name,
          correo: newUser.email,
          rol: (newUserRoles[0] ?? newUser.rol),
          roles: mapUiArrayToBackend(newUserRoles),
          // NO se envía password - se genera automáticamente en el backend
        }),
      });

      if (!resp.ok) throw new Error('No se pudo crear el usuario');

      const created = await resp.json();
      const u = created.data;

      const mapped: UIUser = {
        id: String(u.usuario_id ?? u.id ?? ''),
        name: u.nombre ?? u.name ?? '',
        email: u.correo ?? u.email ?? '',
        rol: normalizeRolToEs(u),
        status:
          u.is_active === false ||
          u.isActive === false ||
          u.status === 'inactive'
            ? 'inactive'
            : 'active',
        lastLogin: u.last_login ?? u.lastLogin ?? undefined,
      };

      setUsers([...users, mapped]);

      // Si hay contraseña temporal, mostrarla y NO cerrar el modal
      if (u.temporaryPassword) {
        setTemporaryPassword(u.temporaryPassword);
        setShowPasswordBanner(true);
        // Limpiar formulario pero mantener modal abierto
        setNewUser({ name: '', email: '', rol: 'operador', status: 'active' });
        setNewUserRoles(["operador"]);
        // NO cerrar el modal aquí - se cerrará cuando el usuario cierre el banner
      } else {
        // Si no hay contraseña temporal, cerrar normalmente
        setNewUser({ name: '', email: '', rol: 'operador', status: 'active' });
        setNewUserRoles(["operador"]);
        setIsCreateModalOpen(false);
      }
    } catch (e) {
      console.error('Error creando usuario:', e);
      alert('Error creando usuario');
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
    try {
      const resp = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nombre: newUser.name,
          correo: newUser.email,
          rol: (editUserRoles[0] ?? newUser.rol),
          roles: mapUiArrayToBackend(editUserRoles),
          is_active: newUser.status === 'active'
        }),
      });
      if (!resp.ok) throw new Error('No se pudo actualizar');
      // actualizar rol primario en vista
      setUsers(users.map(user => user.id === editingUser.id ? { ...user, ...newUser as UIUser, rol: (editUserRoles[0] ?? newUser.rol) } : user));
      setEditingUser(null);
      setNewUser({ name: "", email: "", rol: "operador", status: "active" });
      setEditUserRoles([]);
    } catch (e) {
      alert('Error actualizando usuario');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const resp = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
      if (!resp.ok) throw new Error('No se pudo eliminar');
      setUsers(users.filter(user => user.id !== userId));
    } catch (e) {
      alert('Error eliminando usuario');
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
    return status === 'active' ? 'default' : 'destructive';
  };

  const rolLabels: Record<string, string> = {
    admin: 'Administrador',
    operador: 'Operador',
    analista: 'Analista',
    cliente: 'cliente'
  };

  const statusLabels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo'
  };

  return (
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
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          placeholder="juan.perez@urbanflow.com"
                        />
                      </div>
                      <div>
                        <Label>Roles</Label>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                          {(["operador", "analista", "cliente", "admin"] as UserRole[]).map(r => (
                            <label key={r} className="flex items-center space-x-2">
                              <Checkbox
                                checked={newUserRoles.includes(r)}
                                onCheckedChange={(checked: boolean | 'indeterminate') => {
                                  const c = Boolean(checked);
                                  setNewUserRoles(prev => c ? Array.from(new Set([...prev, r])) : prev.filter(x => x !== r));
                                  if (c && newUser.rol !== r) setNewUser({ ...newUser, rol: r });
                                }}
                              />
                              <span>{r === 'admin' ? 'Administrador' : r.charAt(0).toUpperCase() + r.slice(1)}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">El primer rol marcado será el rol primario del usuario.</p>
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
                      <Button onClick={handleCreateUser}>
                        Crear Usuario
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
                {users.filter(u => u.rol === 'admin').length}
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
                {users.filter(u => u.rol === 'operador').length}
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
                {users.filter(u => u.rol === 'analista').length}
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
                                  {(["operador", "analista", "cliente", "admin"] as UserRole[]).map(r => (
                                    <label key={r} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={editUserRoles.includes(r)}
                                        onCheckedChange={(checked: boolean | 'indeterminate') => {
                                          const c = Boolean(checked);
                                          setEditUserRoles(prev => c ? Array.from(new Set([...prev, r])) : prev.filter(x => x !== r));
                                          if (c && newUser.rol !== r) setNewUser({ ...newUser, rol: r });
                                        }}
                                      />
                                      <span>{r === 'admin' ? 'Administrador' : r.charAt(0).toUpperCase() + r.slice(1)}</span>
                                    </label>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">El primer rol marcado será el rol primario del usuario.</p>
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
  );
}