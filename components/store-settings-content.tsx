'use client'

import { useState } from 'react'
import { Store } from '@/lib/api/stores'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Plus, Edit, Trash2, Store as StoreIcon, MapPin, User, Phone } from 'lucide-react'
import Link from 'next/link'
import { createStore, updateStore, deleteStore } from '@/lib/api/stores'
import { useRouter } from 'next/navigation'

interface StoreSettingsContentProps {
  stores: Store[]
}

const statusLabels: Record<string, string> = {
  active: '营业中',
  inactive: '停业',
  preparing: '筹备中',
  closed: '已关闭',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  closed: 'bg-red-100 text-red-800 border-red-200',
}

export function StoreSettingsContent({ stores: initialStores }: StoreSettingsContentProps) {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 新增店铺表单
  const [newStore, setNewStore] = useState({
    name: '',
    code: '',
    city: '',
    address: '',
    manager_name: '',
    manager_phone: '',
    status: 'active' as const,
  })

  const handleAddStore = async () => {
    if (!newStore.name) {
      alert('请输入店铺名称')
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await createStore(newStore)
      if (error) {
        alert(`添加失败: ${error}`)
      } else if (data) {
        setStores([...stores, data])
        setIsAddDialogOpen(false)
        setNewStore({
          name: '',
          code: '',
          city: '',
          address: '',
          manager_name: '',
          manager_phone: '',
          status: 'active',
        })
        router.refresh()
      }
    } catch (err) {
      alert('添加失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditStore = async () => {
    if (!editingStore) return

    setIsSubmitting(true)
    try {
      const { data, error } = await updateStore(editingStore.id, {
        name: editingStore.name,
        code: editingStore.code,
        city: editingStore.city,
        address: editingStore.address,
        manager_name: editingStore.manager_name,
        manager_phone: editingStore.manager_phone,
        status: editingStore.status,
      })

      if (error) {
        alert(`更新失败: ${error}`)
      } else if (data) {
        setStores(stores.map(s => s.id === data.id ? data : s))
        setIsEditDialogOpen(false)
        setEditingStore(null)
        router.refresh()
      }
    } catch (err) {
      alert('更新失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('确定要删除这个店铺吗？此操作不可恢复。')) {
      return
    }

    try {
      const { error } = await deleteStore(storeId)
      if (error) {
        alert(`删除失败: ${error}`)
      } else {
        setStores(stores.filter(s => s.id !== storeId))
        router.refresh()
      }
    } catch (err) {
      alert('删除失败，请重试')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stores">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回店铺管理
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">店铺设置</h1>
            <p className="text-muted-foreground">管理您的店铺信息</p>
          </div>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新增店铺
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>新增店铺</DialogTitle>
              <DialogDescription>
                填写店铺基本信息
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">店铺名称 *</Label>
                <Input
                  id="name"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  placeholder="例如：上海旗舰店"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">店铺编号</Label>
                <Input
                  id="code"
                  value={newStore.code}
                  onChange={(e) => setNewStore({ ...newStore, code: e.target.value })}
                  placeholder="例如：SH001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">城市</Label>
                <Input
                  id="city"
                  value={newStore.city}
                  onChange={(e) => setNewStore({ ...newStore, city: e.target.value })}
                  placeholder="例如：上海"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">详细地址</Label>
                <Input
                  id="address"
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  placeholder="例如：浦东新区世纪大道100号"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager_name">店长姓名</Label>
                <Input
                  id="manager_name"
                  value={newStore.manager_name}
                  onChange={(e) => setNewStore({ ...newStore, manager_name: e.target.value })}
                  placeholder="例如：张三"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager_phone">店长电话</Label>
                <Input
                  id="manager_phone"
                  value={newStore.manager_phone}
                  onChange={(e) => setNewStore({ ...newStore, manager_phone: e.target.value })}
                  placeholder="例如：13800138000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">店铺状态</Label>
                <Select
                  value={newStore.status}
                  onValueChange={(value) => setNewStore({ ...newStore, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">营业中</SelectItem>
                    <SelectItem value="preparing">筹备中</SelectItem>
                    <SelectItem value="inactive">停业</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddStore} disabled={isSubmitting}>
                {isSubmitting ? '添加中...' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 店铺列表 */}
      <Card>
        <CardHeader>
          <CardTitle>店铺列表</CardTitle>
          <CardDescription>共 {stores.length} 家店铺</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店铺名称</TableHead>
                <TableHead>编号</TableHead>
                <TableHead>城市</TableHead>
                <TableHead>店长</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    暂无店铺，点击右上角"新增店铺"按钮添加
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="h-4 w-4 text-muted-foreground" />
                        {store.name}
                      </div>
                    </TableCell>
                    <TableCell>{store.code || '-'}</TableCell>
                    <TableCell>
                      {store.city ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {store.city}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {store.manager_name ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {store.manager_name}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {store.manager_phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {store.manager_phone}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[store.status]} variant="outline">
                        {statusLabels[store.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingStore(store)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteStore(store.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑店铺</DialogTitle>
            <DialogDescription>
              修改店铺信息
            </DialogDescription>
          </DialogHeader>
          {editingStore && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">店铺名称 *</Label>
                <Input
                  id="edit-name"
                  value={editingStore.name}
                  onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code">店铺编号</Label>
                <Input
                  id="edit-code"
                  value={editingStore.code || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, code: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-city">城市</Label>
                <Input
                  id="edit-city"
                  value={editingStore.city || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, city: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">详细地址</Label>
                <Input
                  id="edit-address"
                  value={editingStore.address || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-manager_name">店长姓名</Label>
                <Input
                  id="edit-manager_name"
                  value={editingStore.manager_name || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, manager_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-manager_phone">店长电话</Label>
                <Input
                  id="edit-manager_phone"
                  value={editingStore.manager_phone || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, manager_phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">店铺状态</Label>
                <Select
                  value={editingStore.status}
                  onValueChange={(value) => setEditingStore({ ...editingStore, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">营业中</SelectItem>
                    <SelectItem value="preparing">筹备中</SelectItem>
                    <SelectItem value="inactive">停业</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditStore} disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
