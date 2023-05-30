const dayjs = require("dayjs");
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

    await carController.handleListCars(reqMock, resMock, nextMock);

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

    await carController.handleGetCar(reqMock, resMock, nextMock);

    expect(resMock.status).toHaveBeenCalledWith(200);
    expect(resMock.json).toHaveBeenCalledWith(car);
    expect(carModelMock.findByPk).toHaveBeenCalledWith(reqMock.params.id);
  });

  test('handleCreateCar should create a car', async () => {
    const newCar = { name: 'Car 1', price: 1000, size: 'Medium', image: 'car.jpg' };
    const createdCar = { id: 1, ...newCar, isCurrentlyRented: false };
    carModelMock.create = jest.fn().mockResolvedValue(createdCar);

    reqMock.body = newCar;

    await carController.handleCreateCar(reqMock, resMock, nextMock);

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
    const userCar = { id: 1, carId: car.id, rentStartedAt, rentEndedAt };
    carController.getCarFromRequest = jest.fn().mockResolvedValue(car);
    dayjsMock.mockReturnValueOnce(rentEndedAt);
    userCarModelMock.findOne = jest.fn().mockResolvedValue(null);
    userCarModelMock.create = jest.fn().mockResolvedValue(userCar);

    reqMock.body = { rentStartedAt };

    await carController.handleRentCar(reqMock, resMock, nextMock);

    expect(resMock.status).toHaveBeenCalledWith(201);
    expect(resMock.json).toHaveBeenCalledWith(userCar);
    expect(carController.getCarFromRequest).toHaveBeenCalledWith(reqMock);
    expect(dayjsMock).toHaveBeenCalledWith(rentStartedAt);
    expect(userCarModelMock.findOne).toHaveBeenCalledWith(expect.any(Object));
    expect(userCarModelMock.create).toHaveBeenCalledWith({
      userId: reqMock.user.id,
      carId: car.id,
      rentStartedAt,
      rentEndedAt,
    });
  });

  test('handleUpdateCar should update a car', async () => {
    const updatedCar = { id: 1, name: 'Updated Car', price: 1500, size: 'Large', image: 'updated.jpg', isCurrentlyRented: false };
    carModelMock.findByPk = jest.fn().mockResolvedValue(updatedCar);
    carModelMock.update = jest.fn().mockResolvedValue([1]);

    reqMock.body = { name: 'Updated Car', price: 1500, size: 'Large', image: 'updated.jpg' };

    await carController.handleUpdateCar(reqMock, resMock, nextMock);

    expect(resMock.status).toHaveBeenCalledWith(200);
    expect(resMock.json).toHaveBeenCalledWith(updatedCar);
    expect(carModelMock.findByPk).toHaveBeenCalledWith(reqMock.params.id);
    expect(carModelMock.update).toHaveBeenCalledWith(
      {
        name: reqMock.body.name,
        price: reqMock.body.price,
        size: reqMock.body.size,
        image: reqMock.body.image,
        isCurrentlyRented: false,
      },
      { where: { id: reqMock.params.id } }
    );
  });

  test('handleDeleteCar should delete a car', async () => {
    carModelMock.destroy = jest.fn().mockResolvedValue(1);

    await carController.handleDeleteCar(reqMock, resMock, nextMock);

    expect(carModelMock.destroy).toHaveBeenCalledWith(reqMock.params.id);
    expect(resMock.status).toHaveBeenCalledWith(204);
    expect(resMock.end).toHaveBeenCalled();
  });
});
