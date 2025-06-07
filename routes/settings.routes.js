const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Contacts = require('../models/Contacts');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const User = require("../models/User") 
const Filial = require('../models/Filial');


// Конфигурация multer для загрузки документов
const contractStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/contracts/';
        cb(null, dir); // Папка для сохранения документов
    },
    filename: function (req, file, cb) {
        // Генерация уникального имени файла
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const uploadContract = multer({ storage: contractStorage });


// Маршрут для обновления настроек
router.post('/updateSettings', uploadContract.single('contract'), [
    check('videoLink').optional().isString(),
    check('chinaAddress').optional().isString(),
    check('whatsappNumber').optional().isString(),
    check('aboutUsText').optional().isString(),
    check('prohibitedItemsText').optional().isString(),
    check('userId').not().isEmpty().withMessage('userId is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Неверный запрос', errors });
        }

        const { videoLink, chinaAddress, whatsappNumber, aboutUsText, prohibitedItemsText, userId } = req.body;
        // Находим пользователя по userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Проверяем роль пользователя
        if (user.role === 'admin') {
            // Для admin обновляем настройки в модели Settings
            let settings = await Settings.findOne();
            if (!settings) {
                settings = new Settings();
            }

            // Обновляем поля настроек
            if (videoLink) settings.videoLink = videoLink;
            if (chinaAddress) settings.chinaAddress = chinaAddress;
            if (whatsappNumber) settings.whatsappNumber = whatsappNumber;
            if (aboutUsText) settings.aboutUsText = aboutUsText;
            if (prohibitedItemsText) settings.prohibitedItemsText = prohibitedItemsText;

            // Обработка загруженного файла, если он есть
            if (req.file) {
                const contractPath = `/uploads/contracts/${req.file.filename}`;
                settings.contractFilePath = contractPath; // Сохраняем путь к загруженному документу
            }

            // Сохраняем изменения в базе данных
            await settings.save();
            return res.status(200).json(settings); // Возвращаем обновленные настройки
        }

        if (user.role === 'filial') {
            // Для filial находим филиал по номеру телефона
            const filial = await Filial.findOne({ userPhone: user.phone });

            if (!filial) {
                return res.status(404).json({ message: 'Filial not found' });
            }

            // Обновляем данные филиала
            if (videoLink) filial.videoLink = videoLink;
            if (chinaAddress) filial.chinaAddress = chinaAddress;
            if (whatsappNumber) filial.whatsappNumber = whatsappNumber;
            if (aboutUsText) filial.aboutUsText = aboutUsText;
            if (prohibitedItemsText) filial.prohibitedItemsText = prohibitedItemsText;
            
            // Обработка загруженного файла, если он есть
            if (req.file) {
                const contractPath = `/uploads/contracts/${req.file.filename}`;
                filial.contractFilePath = contractPath; // Сохраняем путь к загруженному документу
            }

            // Сохраняем изменения в базе данных
            await filial.save();
            return res.status(200).json(filial); // Возвращаем обновленные данные филиала
        }

        // Если роль пользователя не совпала с "admin" или "filial"
        return res.status(403).json({ message: 'Access denied' });
    } catch (error) {
        console.error('Ошибка при обновлении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});




router.get('/getSettings', async (req, res) => {
    try {
        const { userId } = req.query;

        // Находим пользователя по userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User ы found' });
        }

        if (user.role === 'admin') {
            // Для admin возвращаем настройки из Settings
            const settings = await Settings.findOne();
            return res.status(200).json(settings);
        }

        if (user.role === 'filial') {
            // Для filial возвращаем данные из соответствующего филиала
            const filial = await Filial.findOne({ userPhone: user.phone });

            if (!filial) {
                return res.status(404).json({ message: 'Filial not found' });
            }

            return res.status(200).json(filial);
        }

        return res.status(403).json({ message: 'Access denied' });
    } catch (error) {
        console.error('Ошибка при получении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});



// Маршрут для получения настроек
router.get('/getPrice', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.status(200).json(settings);
    } catch (error) {
        console.error('Ошибка при получении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});

// Маршрут для обновления настроек
router.post('/updatePrice', [
    check('price').optional().isString(),
    check('currency').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Неверный запрос', errors });
        }

        const { price,currency } = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        if (price) settings.price = price;
        if (currency) settings.currency = currency;
        
        await settings.save();
        res.status(200).json(settings);
    } catch (error) {
        console.error('Ошибка при обновлении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});


// На сервере (например, в Express.js)
router.put('/globalBonus', async (req, res) => {
    const { globalReferralBonusPercentage } = req.body;
    try {
        const settings = await Settings.findOne();
        if (!settings) {
            return res.status(404).json({ message: 'Настройки не найдены' });
        }
        settings.globalReferralBonusPercentage = globalReferralBonusPercentage;
        await settings.save();
        res.json({ message: 'Общий процент бонуса обновлен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении настроек' });
    }
});


// Получение глобального процента
router.get('/getGlobalBonus', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.status(200).json({ globalReferralBonusPercentage: settings.globalReferralBonusPercentage });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении настроек' });
    }
});




// Контакты
router.post('/updateContacts', async (req, res) => {
    try {
        const {phone, whatsappPhone, whatsappLink, instagram, telegramId, telegramLink, userId} = req.body;

        // Находим пользователя по userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Проверяем роль пользователя
        if (user.role === 'admin') {
            // Получаем текущие настройки или создаем новые
            let contacts = await Contacts.findOne();
            if (!contacts) {
                contacts = new Contacts();
            }

            // Обновляем поля настроек
            if (phone) contacts.phone = phone;
            if (whatsappPhone) contacts.whatsappPhone = whatsappPhone;
            if (whatsappLink) contacts.whatsappLink = whatsappLink;
            if (instagram) contacts.instagram = instagram;
            if (telegramId) contacts.telegramId = telegramId;
            if (telegramLink) contacts.telegramLink = telegramLink;


            // Сохраняем изменения в базе данных
            await contacts.save();
            res.status(200).json(contacts); // Возвращаем обновленные настройки
        }

        if (user.role === 'filial') {
            // Для filial находим филиал по номеру телефона
            const filial = await Filial.findOne({ userPhone: user.phone });

            if (!filial) {
                return res.status(404).json({ message: 'Filial not found' });
            }

             // Обновляем поля настроек
            if (phone) filial.phone = phone;
            if (whatsappPhone) filial.whatsappPhone = whatsappPhone;
            if (whatsappLink) filial.whatsappLink = whatsappLink;
            if (instagram) filial.instagram = instagram;
            if (telegramId) filial.telegramId = telegramId;
            if (telegramLink) filial.telegramLink = telegramLink;
            
            // Сохраняем изменения в базе данных
            await filial.save();
            return res.status(200).json(filial); // Возвращаем обновленные данные филиала
        }

        // Если роль пользователя не совпала с "admin" или "filial"
        return res.status(403).json({ message: 'Access denied' });
    
    } catch (error) {
        console.error('Ошибка при обновлении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});





router.get('/getContacts', async (req, res) => {
    try {
        const { userId } = req.query;

        // Находим пользователя по userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User ы found' });
        }

        if (user.role === 'admin') {
            // Для admin возвращаем настройки из Contacts;
            const contacts = await Contacts.findOne();
            return res.status(200).json(contacts);
        }

        if (user.role === 'filial') {
            // Для filial возвращаем данные из соответствующего филиала
            const filial = await Filial.findOne({ userPhone: user.phone });

            if (!filial) {
                return res.status(404).json({ message: 'Filial not found' });
            }

            return res.status(200).json(filial);
        } else {
                // Проверяем, указал ли пользователь филиал
            if (!user.selectedFilial) {
                return res.status(404).json({ message: 'Филиал пользователя не выбран' });
            }

            // Находим филиал по тексту selectedFilial
            const filial = await Filial.findOne({ filialText: user.selectedFilial });
            if (!filial) {
                return res.status(404).json({ message: 'Филиал не найден' });
            }

            console.log(filial)
            // Возвращаем данные филиала
            return res.status(200).json({ filial });
        }


        return res.status(403).json({ message: 'Access denied' });
    } catch (error) {
        console.error('Ошибка при получении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});




module.exports = router;