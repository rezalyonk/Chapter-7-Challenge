const dayjs = require("dayjs");
const { Op } = require("sequelize");
const ApplicationController = require("../controllers/ApplicationController");
const CarController = require("../controllers/CarController");

describe('CarController', () => {
  let carController;
  let carModelMock;
  let userCarModelMock;
  let dayjsMock;
  let reqMock;
  let resMock;
  let nextMock;

  beforeEach(() => {
    carModelMock = {};
    userCarModelMock = {};
    dayjsMock = jest.fn();

    carController = new CarController({
      carModel: carModelMock,
      userCarModel: userCarModelMock,
      dayjs: dayjsMock,
    });

    reqMock = {
      params: {
        id: 1,
      },
      query: {
        pageSize: 10,
      },
      user: {
        id: 1,
      },
    };

    resMock = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
    };

    nextMock = jest.fn();
  });

  test('handleListCars should return cars and pagination meta', async () => {
    const cars = [{ id: 1, name: 'Car 1' }, { id: 2, name: 'Car 2' }];
    const carCount = 2;
    carModelMock.findAll = jest.fn().mockResolvedValue(cars);
    carModelMock.count = jest.fn().mockResolvedValue(carCount);
    carController.buildPaginationObject = jest.fn().mockReturnValue({});

    await carController.handleListCars(reqMock, resMock);

    expect(resMock.status).toHaveBeenCalledWith(200);
    expect(resMock.json).toHaveBeenCalledWith({
      cars,
      meta: {
        pagination: {},
      },
    });
    expect(carModelMock.findAll).toHaveBeenCalledWith(expect.any(Object));
    expect(carModelMock.count).toHaveBeenCalledWith(expect.any(Object));
  });

  test('handleGetCar should return car', async () => {
    const car = { id: 1, name: 'Car 1' };
    carModelMock.findByPk = jest.fn().mockResolvedValue(car);

    await carController.handleGetCar(reqMock, resMock);

    expect(resMock.status).toHaveBeenCalledWith(200);
    expect(resMock.json).toHaveBeenCalledWith(car);
    expect(carModelMock.findByPk).toHaveBeenCalledWith(reqMock.params.id);
  });

  test('handleCreateCar should create a car', async () => {
    const newCar = { name: 'Car 1', price: 1000, size: 'Medium', image: 'car.jpg' };
    const createdCar = { id: 1, ...newCar, isCurrentlyRented: false };
    carModelMock.create = jest.fn().mockResolvedValue(createdCar);

    reqMock.body = newCar;

    await carController.handleCreateCar(reqMock, resMock);

    expect(resMock.status).toHaveBeenCalledWith(201);
    expect(resMock.json).toHaveBeenCalledWith(createdCar);
    expect(carModelMock.create).toHaveBeenCalledWith({
      name: newCar.name,
      price: newCar.price,
      size: newCar.size,
      image: newCar.image,
      isCurrentlyRented: false,
    });
  });

  test('handleRentCar should create a userCar', async () => {
    const rentStartedAt = '2023-05-29';
    const rentEndedAt = '2023-05-30';
    const car = { id: 1, name: 'Car 1' };
    const userCar = { id: 1, userId: 1, carId: 1, rentStartedAt, rentEndedAt };
    const activeRent = null;
    carController.getCarFromRequest = jest.fn().mockResolvedValue(car);
    userCarModelMock.findOne = jest.fn().mockResolvedValue(activeRent);
    userCarModelMock.create = jest.fn().mockResolvedValue(userCar);

    reqMock.body = { rentStartedAt, rentEndedAt };
    reqMock.user = { id: 1 };

    await carController.handleRentCar(reqMock, resMock, nextMock);

    expect(carController.getCarFromRequest).toHaveBeenCalledWith(reqMock);
    expect(userCarModelMock.findOne).toHaveBeenCalledWith({
      where: {
        carId: car.id,
        rentStartedAt: {
          [Op.gte]: rentStartedAt,
        },
        rentEndedAt: {
          [Op.lte]: rentEndedAt,
        },
      },
    });
    expect(userCarModelMock.create).toHaveBeenCalledWith({
      userId: reqMock.user.id,
      carId: car.id,
      rentStartedAt,
      rentEndedAt,
    });
    expect(resMock.status).toHaveBeenCalledWith(201);
    expect(resMock.json).toHaveBeenCalledWith(userCar);
  });

  test('handleUpdateCar should update the car', async () => {
    const updatedCar = { id: 1, name: 'Updated Car', price: 1500, size: 'Large', image: 'car.jpg' };
    const car = { update: jest.fn().mockResolvedValue([1]) };
    carController.getCarFromRequest = jest.fn().mockResolvedValue(car);
  
    reqMock.body = {
      name: 'Updated Car',
      price: 1500,
      size: 'Large',
      image: 'car.jpg',
    };
  
    await carController.handleUpdateCar(reqMock, resMock);
  
    expect(carController.getCarFromRequest).toHaveBeenCalledWith(reqMock);
    expect(car.update).toHaveBeenCalledWith({
      name: reqMock.body.name,
      price: reqMock.body.price,
      size: reqMock.body.size,
      image: reqMock.body.image,
      isCurrentlyRented: false,
    });
    expect(resMock.status).toHaveBeenCalledWith(200);
    expect(resMock.json).toHaveBeenCalledWith(car); // Mengganti updatedCar dengan car
  });
  
  

  test('handleDeleteCar should delete the car', async () => {
    carModelMock.destroy = jest.fn().mockResolvedValue(1);

    await carController.handleDeleteCar(reqMock, resMock);

    expect(carModelMock.destroy).toHaveBeenCalledWith(reqMock.params.id);
    expect(resMock.status).toHaveBeenCalledWith(204);
    expect(resMock.end).toHaveBeenCalled();
  });
});
