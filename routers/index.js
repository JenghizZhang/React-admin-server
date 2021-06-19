/*
用来定义路由的路由器模块
 */
const express = require('express')
const md5 = require('blueimp-md5')

const UserModel = require('../models/UserModel')
const CategoryModel = require('../models/CategoryModel')
const ProductModel = require('../models/ProductModel')
const RoleModel = require('../models/RoleModel')


// 得到路由器对象
const router = express.Router()
// console.log('router', router)

// 01_登陆
router.post('/login', (req, res) => {
    const { username, password } = req.body
    // 根据username和password查询数据库users, 如果没有, 返回提示错误的信息, 如果有, 返回登陆成功信息(包含user)
    UserModel.findOne({ username, password: md5(password) })
        .then(user => {
            if (user) { // 登陆成功
                // 生成一个cookie(userid: user._id), 并交给浏览器保存
                res.cookie('userid', user._id, { maxAge: 1000 * 60 * 60 * 24 })
                if (user.role_id) {
                    RoleModel.findOne({ _id: user.role_id })
                        .then(role => {
                            user._doc.role = role
                            // console.log('role user', user)
                            res.send({ status: 0, data: user })
                        })
                } else {
                    user._doc.role = { menus: [] }
                    // 返回登陆成功信息(包含user)
                    res.send({ status: 0, data: user })
                }

            } else {// 登陆失败
                res.send({ status: 1, msg: '用户名或密码不正确哦~~~' })
            }
        })
        .catch(error => {
            console.error('登陆异常', error)
            res.send({ status: 1, msg: '登陆异常, 请重新尝试哦~~~' })
        })
})

// 02_添加用户
router.post('/manage/user/add', (req, res) => {
    // 读取请求参数数据
    const { username, password } = req.body
    // 处理: 判断用户是否已经存在, 如果存在, 返回提示错误的信息, 如果不存在, 保存
    // 查询(根据username)
    UserModel.findOne({ username })
        .then(user => {
            // 如果user有值(已存在)
            if (user) {
                // 返回提示错误的信息
                res.send({ status: 1, msg: '此用户已存在' })
                return new Promise(() => {
                })
            } else { // 没值(不存在)
                // 保存
                return UserModel.create({ ...req.body, password: md5(password || '123456') })
            }
        })
        .then(user => {
            // 返回包含user的json数据
            res.send({ status: 0, data: user })
        })
        .catch(error => {
            console.error('注册异常', error)
            res.send({ status: 1, msg: '添加用户异常, 请重新尝试' })
        })
})

// 03_更新用户
router.post('/manage/user/update', (req, res) => {
    const user = req.body
    UserModel.updateMany({ _id: user._id }, { $set: user })
        .then(oldUser => {
            const data = Object.assign(oldUser, user)
            // 返回
            res.send({ status: 0, data })
        })
        .catch(error => {
            console.error('更新用户异常', error)
            res.send({ status: 1, msg: '更新用户异常, 请重新尝试' })
        })
})

// 04_获取所有用户列表
router.get('/manage/user/list', (req, res) => {
    UserModel.find({ username: { '$ne': 'admin' } })
        .then(users => {
            RoleModel.find().then(roles => {
                res.send({ status: 0, data: { users, roles } })
            })
        })
        .catch(error => {
            console.error('获取用户列表异常', error)
            res.send({ status: 1, msg: '获取用户列表异常, 请重新尝试' })
        })
})

// 05_删除用户
router.post('/manage/user/delete', (req, res) => {
    const { userId } = req.body
    UserModel.deleteOne({ _id: userId })
        .then((doc) => {
            res.send({ status: 0, doc })
        })
        .catch(error => {
            res.send({ status: 1, msg: '删除用户异常, 请重新尝试' })
        })
})

// 06_获取分类列表
router.get('/manage/category/list', (req, res) => {
    const parentId = req.query.parentId || '0'
    CategoryModel.find({ parentId })
        .then(categorys => {
            res.send({ status: 0, data: categorys })
        })
        .catch(error => {
            console.error('获取分类列表异常', error)
            res.send({ status: 1, msg: '获取分类列表异常, 请重新尝试' })
        })
})

// 07_添加分类
router.post('/manage/category/add', (req, res) => {
    const { categoryName, parentId } = req.body
    CategoryModel.create({ name: categoryName, parentId: parentId || '0' })
        .then(category => {
            res.send({ status: 0, data: category })
        })
        .catch(error => {
            console.error('添加分类异常', error)
            res.send({ status: 1, msg: '添加分类异常, 请重新尝试' })
        })
})

// 08_更新分类名称
router.post('/manage/category/update', (req, res) => {
    const { categoryId, categoryName } = req.body
    CategoryModel.updateOne({ _id: categoryId }, {$set:{ name: categoryName }})
        .then(state => {
            res.send({ status: 0, data: state })
        })
        .catch(error => {
            console.error('更新分类名称异常', error)
            res.send({ status: 1, msg: '更新分类名称异常, 请重新尝试' })
        })
})
// require('./file-upload')(router)

// 09_根据分类ID获取分类
router.get('/manage/category/info', (req, res) => {
    const categoryId = req.query.categoryId
    CategoryModel.findOne({ _id: categoryId })
        .then(category => {
            res.send({ status: 0, data: category })
        })
        .catch(error => {
            console.error('获取分类信息异常', error)
            res.send({ status: 1, msg: '获取分类信息异常, 请重新尝试' })
        })
})

// 10_获取产品分页列表
router.get('/manage/product/list', (req, res) => {
    const { pageNum, pageSize } = req.query
    ProductModel.find({})
        .then(products => {
            res.send({ status: 0, data: pageFilter(products, pageNum, pageSize) })
        })
        .catch(error => {
            console.error('获取商品列表异常', error)
            res.send({ status: 1, msg: '获取商品列表异常, 请重新尝试' })
        })
})

// 11_根据ID/Name搜索产品分页列表
router.get('/manage/product/search', (req, res) => {
    const { pageNum, pageSize, searchName, productName, productDesc } = req.query
    let contition = {}
    if (productName) {
        contition = { name: new RegExp(`^.*${productName}.*$`) }
    } else if (productDesc) {
        contition = { desc: new RegExp(`^.*${productDesc}.*$`) }
    }
    ProductModel.find(contition)
        .then(products => {
            res.send({ status: 0, data: pageFilter(products, pageNum, pageSize) })
        })
        .catch(error => {
            console.error('搜索商品列表异常', error)
            res.send({ status: 1, msg: '搜索商品列表异常, 请重新尝试' })
        })
})

// 12_添加产品
router.post('/manage/product/add', (req, res) => {
    const product = req.body
    ProductModel.create(product)
        .then(product => {
            res.send({ status: 0, data: product })
        })
        .catch(error => {
            console.error('添加产品异常', error)
            res.send({ status: 1, msg: '添加产品异常, 请重新尝试' })
        })
})

// 13_更新产品
router.post('/manage/product/update', (req, res) => {
    const product = req.body
    ProductModel.updateMany({ _id: product._id }, { $set: product })
    // ProductModel.updateMany({ _id: product._id }, product)
        .then(oldProduct => {
            res.send({ status: 0 })
        })
        .catch(error => {
            console.error('更新商品异常', error)
            res.send({ status: 1, msg: '更新商品名称异常, 请重新尝试' })
        })
})

// 14_对商品进行上架/下架处理
router.post('/manage/product/updateStatus', (req, res) => {
    const { productId, status } = req.body
    ProductModel.updateMany({ _id: productId }, { $set: { status } })
        .then(oldProduct => {
            res.send({ status: 0, oldProduct })
        })
        .catch(error => {
            console.error('更新产品状态异常', error)
            res.send({ status: 1, msg: '更新产品状态异常, 请重新尝试' })
        })
})

// 15. 上传商品图片
// 16. 删除商品图片

// 17. 添加角色
router.post('/manage/role/add', (req, res) => {
    const { roleName } = req.body
    RoleModel.create({ name: roleName })
        .then(role => {
            res.send({ status: 0, data: role })
        })
        .catch(error => {
            console.error('添加角色异常', error)
            res.send({ status: 1, msg: '添加角色异常, 请重新尝试' })
        })
})

// 18. 获取角色列表
router.get('/manage/role/list', (req, res) => {
    RoleModel.find()
        .then(roles => {
            res.send({ status: 0, data: roles })
        })
        .catch(error => {
            console.error('获取角色列表异常', error)
            res.send({ status: 1, msg: '获取角色列表异常, 请重新尝试' })
        })
})

// 19. 更新角色(设置权限)
router.post('/manage/role/update', (req, res) => {
    const role = req.body
    role.auth_time = Date.now()
    RoleModel.updateMany({ _id: role._id }, { $set: role })
        .then(oldRole => {
            // console.log('---', oldRole._doc)
            res.send({ status: 0, data: { ...oldRole._doc, ...role } })
        })
        .catch(error => {
            console.error('更新角色异常', error)
            res.send({ status: 1, msg: '更新角色异常, 请重新尝试' })
        })
})

// 20. 高德地图请求地址和天气

// 21. 给角色重命名
router.post('/manage/role/rename', (req, res) => {
    const { name, id } = req.body
    RoleModel.updateMany({ _id: id }, { $set: { name } })
        .then(oldRole => {
            res.send({ status: 0, oldRole })
        })
        .catch(error => {
            console.error('更新角色名称异常', error)
            res.send({ status: 1, msg: '更新角色名称异常, 请重新尝试' })
        })
})

/*
得到指定数组的分页信息对象
 */
function pageFilter(arr, pageNum, pageSize) {
    pageNum = pageNum * 1
    pageSize = pageSize * 1
    const total = arr.length
    const pages = Math.floor((total + pageSize - 1) / pageSize)
    const start = pageSize * (pageNum - 1)
    const end = start + pageSize <= total ? start + pageSize : total
    const list = []
    for (var i = start; i < end; i++) {
        list.push(arr[i])
    }

    return {
        pageNum,
        total,
        pages,
        pageSize,
        list
    }
}

require('./file-upload')(router)

module.exports = router