'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  UserPlus,
  Users,
  Mail,
  Copy,
  Trash2,
  Edit,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Store as StoreIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createUserAccount,
  getInvitations,
  deleteInvitation,
  resendInvitation,
  type Invitation,
} from '@/lib/api/invitations'
import {
  getCompanyUsers,
  updateUserRole,
  updateUserStores,
  removeUser,
  type CompanyUser,
} from '@/lib/api/users'
import { getRoleName, getInvitableRoles, type UserRole } from '@/lib/auth/permissions'

interface Store {
  id: string
  name: string
}

interface UserManagementProps {
  stores: Store[]
  currentUserId: string
  currentUserRole: UserRole
}

export function UserManagement({ stores, currentUserId, currentUserRole }: UserManagementProps) {
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  // 添加成员表单状态
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addUsername, setAddUsername] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addFullName, setAddFullName] = useState('')
  const [addRole, setAddRole] = useState<'accountant' | 'manager' | 'user'>('user')
  const [addStores, setAddStores] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  // 编辑用户状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('user')
  const [editStores, setEditStores] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersResult, invitationsResult] = await Promise.all([
        getCompanyUsers(),
        getInvitations(),
      ])

      if (usersResult.data) setUsers(usersResult.data)
      if (invitationsResult.data) setInvitations(invitationsResult.data)
    } catch (error) {
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 添加成员
  const handleAddUser = async () => {
    if (!addUsername) {
      toast.error('请输入用户名')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(addUsername)) {
      toast.error('用户名只能包含字母、数字和下划线')
      return
    }

    if (!addPassword || addPassword.length < 6) {
      toast.error('密码至少6位')
      return
    }

    if (!addFullName.trim()) {
      toast.error('请输入姓名')
      return
    }

    if ((addRole === 'manager' || addRole === 'user') && addStores.length === 0) {
      toast.error('请选择至少一个店铺')
      return
    }

    setAdding(true)
    try {
      const result = await createUserAccount({
        username: addUsername,
        password: addPassword,
        fullName: addFullName.trim(),
        role: addRole,
        managed_store_ids: addRole === 'accountant' ? [] : addStores,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('成员添加成功')
        setAddDialogOpen(false)
        setAddUsername('')
        setAddPassword('')
        setAddFullName('')
        setAddRole('user')
        setAddStores([])
        loadData()
      }
    } finally {
      setAdding(false)
    }
  }

  // 复制邀请链接（保留以兼容旧邀请）
  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    toast.success('邀请链接已复制')
  }

  // 删除邀请
  const handleDeleteInvitation = async (id: string) => {
    const result = await deleteInvitation(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('邀请已删除')
      loadData()
    }
  }

  // 重新发送邀请
  const handleResendInvitation = async (id: string) => {
    const result = await resendInvitation(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('邀请已重新发送')
      loadData()
    }
  }

  // 打开编辑用户对话框
  const openEditDialog = (user: CompanyUser) => {
    setEditingUser(user)
    setEditRole(user.role)
    setEditStores(user.managed_store_ids || [])
    setEditDialogOpen(true)
  }

  // 保存用户编辑
  const handleSaveUser = async () => {
    if (!editingUser) return

    if ((editRole === 'manager' || editRole === 'user') && editStores.length === 0) {
      toast.error('请选择至少一个店铺')
      return
    }

    setSaving(true)
    try {
      const result = await updateUserRole(
        editingUser.id,
        editRole,
        editRole === 'accountant' ? [] : editStores
      )

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('用户信息已更新')
        setEditDialogOpen(false)
        loadData()
      }
    } finally {
      setSaving(false)
    }
  }

  // 移除用户
  const handleRemoveUser = async (userId: string) => {
    const result = await removeUser(userId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('用户已移除')
      loadData()
    }
  }

  // 获取店铺名称
  const getStoreName = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId)
    return store?.name || '已删除的店铺'
  }

  // 权限检查
  const canManageUsers = currentUserRole === 'owner'

  if (!canManageUsers && currentUserRole !== 'accountant') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">您没有权限查看用户管理</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                团队成员
              </CardTitle>
              <CardDescription>管理公司的所有用户</CardDescription>
            </div>
            {canManageUsers && (
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    添加成员
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加新成员</DialogTitle>
                    <DialogDescription>
                      直接创建账号，新成员可立即使用用户名和密码登录
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>姓名 *</Label>
                      <Input
                        type="text"
                        placeholder="请输入姓名"
                        value={addFullName}
                        onChange={(e) => setAddFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>用户名 *</Label>
                      <Input
                        type="text"
                        placeholder="字母、数字、下划线"
                        value={addUsername}
                        onChange={(e) => setAddUsername(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">用于登录系统</p>
                    </div>
                    <div className="space-y-2">
                      <Label>登录密码 *</Label>
                      <Input
                        type="password"
                        placeholder="至少6位"
                        value={addPassword}
                        onChange={(e) => setAddPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>角色</Label>
                      <Select value={addRole} onValueChange={(v) => setAddRole(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getInvitableRoles().map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(addRole === 'manager' || addRole === 'user') && (
                      <div className="space-y-2">
                        <Label>管理的店铺</Label>
                        <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                          {stores.map((store) => (
                            <div key={store.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`add-store-${store.id}`}
                                checked={addStores.includes(store.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setAddStores([...addStores, store.id])
                                  } else {
                                    setAddStores(addStores.filter((id) => id !== store.id))
                                  }
                                }}
                              />
                              <label
                                htmlFor={`add-store-${store.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {store.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleAddUser} disabled={adding}>
                      {adding ? '创建中...' : '创建账号'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无成员</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>管理店铺</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.full_name || '未设置'}
                          {user.id === currentUserId && (
                            <Badge variant="outline" className="ml-2">
                              我
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground font-mono text-sm">
                        {user.username || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'owner' ? 'default' : 'secondary'}
                      >
                        {getRoleName(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'owner' || user.role === 'accountant' ? (
                        <span className="text-muted-foreground">所有店铺</span>
                      ) : user.managed_store_ids?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.managed_store_ids.map((storeId) => (
                            <Badge key={storeId} variant="outline" className="text-xs">
                              <StoreIcon className="h-3 w-3 mr-1" />
                              {getStoreName(storeId)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">未分配</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageUsers && user.id !== currentUserId && user.role !== 'owner' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认移除用户？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  移除后，该用户将无法访问公司数据。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveUser(user.id)}
                                  className="bg-destructive !text-white hover:bg-destructive/90"
                                >
                                  确认移除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              修改 {editingUser?.full_name || '用户'} 的角色和权限
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>角色</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getInvitableRoles().map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(editRole === 'manager' || editRole === 'user') && (
              <div className="space-y-2">
                <Label>管理的店铺</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {stores.map((store) => (
                    <div key={store.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-store-${store.id}`}
                        checked={editStores.includes(store.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditStores([...editStores, store.id])
                          } else {
                            setEditStores(editStores.filter((id) => id !== store.id))
                          }
                        }}
                      />
                      <label
                        htmlFor={`edit-store-${store.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {store.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
